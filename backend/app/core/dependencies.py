"""
Dependency injection functions for FastAPI.
"""
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError

from app.db.session import SessionLocal
from app.core.config import settings
from app.core.security import decode_access_token
from app.models.auth import User
from app.core.exceptions import UnauthorizedException

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)


def get_token_from_cookie_or_header(request: Request, token: Optional[str] = Depends(oauth2_scheme)) -> Optional[str]:
    """
    Get access token from cookie (preferred) or Authorization header (fallback).
    """
    # Try to get token from cookie first
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    
    # Fallback to Authorization header
    if token:
        return token
    
    return None


def get_db() -> Generator:
    """
    Database session dependency.
    Yields a database session and closes it after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie_or_header),
) -> User:
    """
    Get current authenticated user.

    Preferred order:
    1. Validate JWT access token from cookie / Authorization header.
    2. If token missing/invalid, fall back to remember_token cookie (if present).
    """
    credentials_exception = UnauthorizedException("Could not validate credentials")

    # 1. Try JWT access token first
    if token:
        payload = decode_access_token(token)
        if payload is not None:
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception

            user = db.query(User).filter(User.username == username).first()
            if user is None:
                raise credentials_exception
            return user

    # 2. Fallback: remember_token cookie (for long-lived sessions)
    remember_token = request.cookies.get("remember_token")
    if remember_token:
        user = db.query(User).filter(User.remember_token == remember_token).first()
        if user is not None:
            return user

    raise credentials_exception


def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current active user (not deleted).
    """
    if current_user.deleted_at is not None:
        raise UnauthorizedException("User is inactive")
    return current_user


def get_optional_active_user(
    request: Request,
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(get_token_from_cookie_or_header),
) -> Optional[User]:
    """Return active user when authenticated; None for anonymous (no error)."""
    try:
        user = get_current_user(request, db, token)
    except UnauthorizedException:
        return None
    if user.deleted_at is not None:
        return None
    return user

