"""
Authentication endpoints.
"""
from datetime import datetime, timedelta
from secrets import token_urlsafe
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_active_user
from app.core.config import settings

from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    get_password_hash,
)
from app.core.exceptions import UnauthorizedException, BadRequestException
from app.core.turnstile import turnstile_is_configured, verify_turnstile_response
from app.core.rate_limit import enforce_login_rate_limit
from app.models.auth import User
from app.schemas.auth import Token, LoginRequest, SessionConfig, SessionStatus
from app.schemas.user import UserCreate, UserRead
from app.schemas.common import WebResponse

router = APIRouter()


def _idle_timeout_minutes() -> int:
    idle = settings.SESSION_IDLE_TIMEOUT_MINUTES
    return idle if idle > 0 else settings.ACCESS_TOKEN_EXPIRE_MINUTES


def _session_config_payload() -> SessionConfig:
    return SessionConfig(
        access_token_expire_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        refresh_token_expire_days=settings.REFRESH_TOKEN_EXPIRE_DAYS,
        idle_timeout_minutes=_idle_timeout_minutes(),
        session_warning_seconds=settings.SESSION_WARNING_SECONDS,
        session_refresh_buffer_seconds=settings.SESSION_REFRESH_BUFFER_SECONDS,
    )


def _access_token_expires_in() -> int:
    return settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip() or None
    if request.client:
        return request.client.host
    return None


@router.post("/login", response_model=WebResponse[Token])
def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    User login endpoint.
    Supports login with either email or username.
    Sets access token in HttpOnly cookie for security.
    """
    enforce_login_rate_limit(request)

    if turnstile_is_configured():
        if not login_data.turnstile_token or not str(login_data.turnstile_token).strip():
            raise BadRequestException(
                "Verifikasi keamanan wajib. Muat ulang halaman lalu coba lagi."
            )
        if not verify_turnstile_response(login_data.turnstile_token, _client_ip(request)):
            raise BadRequestException(
                "Verifikasi keamanan gagal atau kedaluwarsa. Silakan coba lagi."
            )

    # Find user by email or username
    if login_data.email:
        user = db.query(User).filter(User.email == login_data.email).first()
    else:
        user = db.query(User).filter(User.username == login_data.username).first()
    
    if not user or not verify_password(login_data.password, user.password):
        raise UnauthorizedException("Incorrect email/username or password")
    
    if user.deleted_at is not None:
        raise UnauthorizedException("User account is inactive")
    
    # Access token selalu short-lived; remember_me dikendalikan via remember_token cookie
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds for access_token cookie
    
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )

    refresh_token = create_refresh_token({"sub": user.username, "user_id": user.id})
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    # Set access token in HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )

    # Handle remember_me using opaque remember_token stored in DB and cookie
    if login_data.remember_me:
        remember_token = token_urlsafe(64)
        user.remember_token = remember_token
        db.add(user)
        db.commit()

        response.set_cookie(
            key="remember_token",
            value=remember_token,
            max_age=30 * 24 * 60 * 60,  # 30 days
            httponly=True,
            samesite="lax",
            secure=settings.COOKIE_SECURE,
            path="/",
        )
    else:
        # Clear previous remember token if any
        if user.remember_token:
            user.remember_token = None
            db.add(user)
            db.commit()
        response.delete_cookie("remember_token", path="/")
    
    return WebResponse(
        status="success",
        message="Login successful",
        data=Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=max_age,
        ),
    )


@router.get("/session-config", response_model=WebResponse[SessionConfig])
def get_session_config():
    """Public session timing for the SPA (idle timeout, warning lead time, token TTL)."""
    return WebResponse(
        status="success",
        message="ok",
        data=_session_config_payload(),
    )


@router.get("/session", response_model=WebResponse[SessionStatus])
def get_session_status(
    request: Request,
    current_user: User = Depends(get_current_active_user),
):
    """Remaining access token lifetime from the HttpOnly cookie JWT."""
    raw = request.cookies.get("access_token")
    if not raw:
        return WebResponse(
            status="success",
            message="ok",
            data=SessionStatus(expires_in=0, expires_at=None),
        )
    payload = decode_access_token(raw)
    if not payload or payload.get("sub") != current_user.username:
        return WebResponse(
            status="success",
            message="ok",
            data=SessionStatus(expires_in=0, expires_at=None),
        )
    exp = payload.get("exp")
    if not exp:
        return WebResponse(
            status="success",
            message="ok",
            data=SessionStatus(expires_in=0, expires_at=None),
        )
    expires_at = int(exp)
    expires_in = max(0, expires_at - int(datetime.utcnow().timestamp()))
    return WebResponse(
        status="success",
        message="ok",
        data=SessionStatus(expires_in=expires_in, expires_at=expires_at),
    )


def _set_auth_cookies_from_refresh_payload(
    response: Response,
    payload: dict,
    db: Session,
) -> None:
    """Issue new access + refresh cookies from a validated refresh token payload."""
    user_id = payload.get("user_id")
    username = payload.get("sub")
    if not user_id or not username:
        raise UnauthorizedException("Invalid or expired session")

    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if user is None or user.username != username:
        raise UnauthorizedException("Invalid or expired session")

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    if payload.get("is_impersonating"):
        original_user_id = payload.get("original_user_id")
        original_username = payload.get("original_username")
        if not original_user_id or not original_username:
            raise UnauthorizedException("Invalid or expired session")
        original_user = db.query(User).filter(
            User.id == original_user_id,
            User.deleted_at.is_(None),
        ).first()
        if original_user is None or original_user.username != original_username:
            raise UnauthorizedException("Invalid or expired session")

        access_token = create_access_token(
            data={
                "sub": user.username,
                "user_id": user.id,
                "original_user_id": original_user.id,
                "original_username": original_user.username,
                "is_impersonating": True,
            },
            expires_delta=access_token_expires,
        )
        new_refresh = create_refresh_token(
            {
                "sub": user.username,
                "user_id": user.id,
                "original_user_id": original_user.id,
                "original_username": original_user.username,
                "is_impersonating": True,
            }
        )
    else:
        access_token = create_access_token(
            data={"sub": user.username, "user_id": user.id},
            expires_delta=access_token_expires,
        )
        new_refresh = create_refresh_token({"sub": user.username, "user_id": user.id})

    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=new_refresh,
        max_age=refresh_max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )


@router.post("/refresh", response_model=WebResponse[dict])
def refresh_session(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    Mint a new access_token (and rotated refresh_token) using the HttpOnly refresh_token cookie.
    Does not require a valid access token.
    """
    raw = request.cookies.get("refresh_token")
    if not raw:
        raise UnauthorizedException("Invalid or expired session")

    payload = decode_refresh_token(raw)
    if not payload:
        raise UnauthorizedException("Invalid or expired session")

    _set_auth_cookies_from_refresh_payload(response, payload, db)

    return WebResponse(
        status="success",
        message="Session refreshed",
        data={
            "refreshed": True,
            "expires_in": _access_token_expires_in(),
        },
    )


@router.post("/register", response_model=WebResponse[UserRead])
def register(
    user_data: UserCreate,
    db: Session = Depends(get_db)
):
    """
    User registration endpoint.
    Disabled unless ALLOW_PUBLIC_REGISTER=true in environment.
    """
    if not settings.ALLOW_PUBLIC_REGISTER:
        raise BadRequestException("Registrasi publik tidak diaktifkan. Hubungi administrator.")
    # Check if username already exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise BadRequestException("Username already registered")
    
    # Check if email already exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise BadRequestException("Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    db_user = User(
        username=user_data.username,
        email=user_data.email,
        firstname=user_data.firstname,
        lastname=user_data.lastname,
        fullname=user_data.fullname,
        phone_number=user_data.phone_number,
        password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return WebResponse(
        status="success",
        message="User registered successfully",
        data=UserRead.model_validate(db_user)
    )


@router.post("/logout", response_model=WebResponse[None])
def logout(
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    Logout endpoint.
    Clears access_token, refresh_token, and remember_token cookies and resets remember_token in DB.
    """
    current_user.remember_token = None
    db.add(current_user)
    db.commit()

    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    response.delete_cookie("remember_token", path="/")

    return WebResponse(status="success", message="Logged out successfully")

