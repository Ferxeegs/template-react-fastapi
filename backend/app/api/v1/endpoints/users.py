"""
User management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from datetime import datetime, timedelta

from app.api.deps import get_db, get_current_active_user, require_permission
from app.models.auth import User, Role, user_roles
from app.schemas.user import (
    UserRead, UserCreate, UserUpdate, UserRoleUpdate, UserPasswordReset, UserPasswordChange
)
from app.schemas.common import WebResponse
from app.core.security import (
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_access_token,
    verify_password,
)
from app.core.config import settings
from app.core.exceptions import (
    NotFoundException, BadRequestException, ConflictException, ForbiddenException, UnauthorizedException
)

router = APIRouter()


def has_superadmin_role(user: User, db: Session) -> bool:
    """Check if user has superadmin role."""
    db.refresh(user, ["roles"])
    return any(role.name == "superadmin" for role in user.roles)


@router.get("/", response_model=WebResponse[dict])
def get_all_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_user")),
):
    """
    Get all users with pagination and search.
    """
    query = db.query(User).filter(User.deleted_at.is_(None))
    
    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.firstname.ilike(f"%{search}%"),
            User.lastname.ilike(f"%{search}%"),
            User.fullname.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    total = query.count()
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    
    # Eager load roles and permissions in roles
    for user in users:
        db.refresh(user, ["roles"])
        # Refresh permissions for each role
        for role in user.roles:
            db.refresh(role, ["permissions"])
    
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "users": [UserRead.model_validate(user) for user in users],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/deleted", response_model=WebResponse[dict])
def get_deleted_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_user")),
):
    """
    Get all deleted users with pagination and search.
    """
    query = db.query(User).filter(User.deleted_at.isnot(None))
    
    if search:
        search_filter = or_(
            User.username.ilike(f"%{search}%"),
            User.email.ilike(f"%{search}%"),
            User.firstname.ilike(f"%{search}%"),
            User.lastname.ilike(f"%{search}%"),
            User.fullname.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    total = query.count()
    offset = (page - 1) * limit
    users = query.offset(offset).limit(limit).all()
    
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "users": [UserRead.model_validate(user) for user in users],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/me", response_model=WebResponse[dict])
def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get current user information.
    PENTING: Route ini harus didefinisikan SEBELUM /{user_id} agar "me" tidak dianggap sebagai user_id.
    Returns impersonatedBy info if currently impersonating.
    """
    # Eager load roles dan permissions di dalam roles
    db.refresh(current_user, ["roles"])
    # Refresh permissions untuk setiap role
    for role in current_user.roles:
        db.refresh(role, ["permissions"])
    
    # Check if currently impersonating
    token = request.cookies.get("access_token")
    impersonated_by = None
    
    if token:
        from app.core.security import decode_access_token
        payload = decode_access_token(token)
        if payload and payload.get("is_impersonating"):
            original_user_id = payload.get("original_user_id")
            original_username = payload.get("original_username")
            if original_user_id and original_username:
                original_user = db.query(User).filter(User.id == original_user_id).first()
                if original_user:
                    impersonated_by = {
                        "id": original_user.id,
                        "username": original_user.username,
                        "email": original_user.email
                    }
    
    user_data = UserRead.model_validate(current_user)
    response_data = user_data.model_dump()
    if impersonated_by:
        response_data["impersonatedBy"] = impersonated_by
    
    return WebResponse(
        status="success",
        data=response_data
    )


@router.put("/me", response_model=WebResponse[UserRead])
def update_current_user(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information.
    PENTING: Route ini harus didefinisikan SEBELUM /{user_id} agar "me" tidak dianggap sebagai user_id.
    """
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Check username uniqueness if updating username
    if "username" in update_data and update_data["username"] != current_user.username:
        existing_user = db.query(User).filter(
            User.username == update_data["username"],
            User.id != current_user.id,
            User.deleted_at.is_(None)
        ).first()
        if existing_user:
            raise ConflictException(f"Username '{update_data['username']}' already exists")
    
    # Check email uniqueness if updating email
    if "email" in update_data and update_data["email"] != current_user.email:
        existing_email = db.query(User).filter(
            User.email == update_data["email"],
            User.id != current_user.id,
            User.deleted_at.is_(None)
        ).first()
        if existing_email:
            raise ConflictException(f"Email '{update_data['email']}' already exists")
    
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    
    for field, value in update_data.items():
        setattr(current_user, field, value)
    
    # Set audit fields
    from datetime import datetime, timezone
    current_user.updated_by = current_user.id
    current_user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(current_user, ["roles"])
    # Refresh permissions for each role
    for role in current_user.roles:
        db.refresh(role, ["permissions"])
    
    return WebResponse(
        status="success",
        message="User updated successfully",
        data=UserRead.model_validate(current_user)
    )


@router.post("/me/change-password", response_model=WebResponse[dict])
def change_current_user_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change current user password with validation of current password.
    PENTING: Route ini harus didefinisikan SEBELUM /{user_id} agar "me" tidak dianggap sebagai user_id.
    """
    # Verify current password
    if not verify_password(password_data.current_password, current_user.password):
        raise UnauthorizedException("Current password is incorrect")
    
    # Check if new password is same as current password
    if verify_password(password_data.password, current_user.password):
        raise BadRequestException("New password must be different from current password")
    
    # Hash new password
    current_user.password = get_password_hash(password_data.password)
    
    # Set audit fields
    from datetime import datetime, timezone
    current_user.updated_by = current_user.id
    current_user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    
    return WebResponse(
        status="success",
        message="Password changed successfully"
    )


@router.get("/{user_id}", response_model=WebResponse[UserRead])
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_user")),
):
    """
    Get user by ID.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    db.refresh(user, ["roles"])
    # Refresh permissions for each role
    for role in user.roles:
        db.refresh(role, ["permissions"])
    return WebResponse(
        status="success",
        data=UserRead.model_validate(user)
    )


@router.post("/", response_model=WebResponse[UserRead], status_code=status.HTTP_201_CREATED)
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("create_user")),
):
    """
    Create a new user.
    """
    # Check if username already exists
    existing_user = db.query(User).filter(
        User.username == user_data.username,
        User.deleted_at.is_(None)
    ).first()
    if existing_user:
        raise ConflictException(f"Username '{user_data.username}' already exists")
    
    # Check if email already exists
    existing_email = db.query(User).filter(
        User.email == user_data.email,
        User.deleted_at.is_(None)
    ).first()
    if existing_email:
        raise ConflictException(f"Email '{user_data.email}' already exists")
    
    # Create user
    user_dict = user_data.model_dump(exclude={"password", "role_ids"})
    user_dict["password"] = get_password_hash(user_data.password)
    user_dict["created_by"] = current_user.id
    
    user = User(**user_dict)
    db.add(user)
    db.flush()  # Flush to get user ID
    
    # Assign roles if provided
    if user_data.role_ids:
        roles = db.query(Role).filter(Role.id.in_(user_data.role_ids)).all()
        if len(roles) != len(user_data.role_ids):
            raise BadRequestException("One or more role IDs are invalid")
        user.roles = roles
    
    db.commit()
    db.refresh(user, ["roles"])
    # Refresh permissions for each role
    for role in user.roles:
        db.refresh(role, ["permissions"])
    
    return WebResponse(
        status="success",
        message="User created successfully",
        data=UserRead.model_validate(user)
    )


@router.put("/{user_id}", response_model=WebResponse[UserRead])
def update_user(
    user_id: str,
    user_update: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_user")),
):
    """
    Update user by ID.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Check username uniqueness if updating username
    if "username" in update_data and update_data["username"] != user.username:
        existing_user = db.query(User).filter(
            User.username == update_data["username"],
            User.id != user_id,
            User.deleted_at.is_(None)
        ).first()
        if existing_user:
            raise ConflictException(f"Username '{update_data['username']}' already exists")
    
    # Check email uniqueness if updating email
    if "email" in update_data and update_data["email"] != user.email:
        existing_email = db.query(User).filter(
            User.email == update_data["email"],
            User.id != user_id,
            User.deleted_at.is_(None)
        ).first()
        if existing_email:
            raise ConflictException(f"Email '{update_data['email']}' already exists")
    
    # Hash password if updating
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    
    update_data["updated_by"] = current_user.id
    
    for field, value in update_data.items():
        setattr(user, field, value)
    
    # Set updated_at explicitly to ensure it's updated
    from datetime import datetime, timezone
    user.updated_at = datetime.now(timezone.utc)
    
    db.commit()
    db.refresh(user, ["roles"])
    # Refresh permissions for each role
    for role in user.roles:
        db.refresh(role, ["permissions"])
    
    return WebResponse(
        status="success",
        message="User updated successfully",
        data=UserRead.model_validate(user)
    )


@router.delete("/{user_id}", response_model=WebResponse[None])
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("delete_user")),
):
    """
    Soft delete user by ID.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    user.deleted_at = datetime.utcnow()
    user.deleted_by = current_user.id
    
    db.commit()
    
    return WebResponse(
        status="success",
        message="User deleted successfully"
    )


@router.delete("/{user_id}/force", response_model=WebResponse[None])
def force_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("force_delete_user")),
):
    """
    Permanently delete user by ID (hard delete).
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    db.delete(user)
    db.commit()
    
    return WebResponse(
        status="success",
        message="User permanently deleted"
    )


@router.put("/{user_id}/roles", response_model=WebResponse[dict])
def update_user_roles(
    user_id: str,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_user")),
):
    """
    Update user roles.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    # Validate role IDs
    if role_update.role_ids:
        roles = db.query(Role).filter(Role.id.in_(role_update.role_ids)).all()
        if len(roles) != len(role_update.role_ids):
            raise BadRequestException("One or more role IDs are invalid")
        user.roles = roles
    else:
        user.roles = []
    
    db.commit()
    db.refresh(user, ["roles"])
    
    return WebResponse(
        status="success",
        message="User roles updated successfully",
        data={"roles": [{"id": r.id, "name": r.name, "guard_name": r.guard_name} for r in user.roles]}
    )


@router.post("/{user_id}/verify-email", response_model=WebResponse[dict])
def verify_user_email(
    user_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_user")),
):
    """
    Verify user email.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    user.email_verified_at = datetime.utcnow()
    db.commit()
    
    return WebResponse(
        status="success",
        message="Email verified successfully",
        data={"email_verified_at": user.email_verified_at.isoformat()}
    )


@router.post("/{user_id}/send-verification-email", response_model=WebResponse[dict])
def send_verification_email(
    user_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_user")),
):
    """
    Send verification email to user.
    Note: This is a placeholder. Implement actual email sending logic.
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    # TODO: Implement actual email sending logic
    return WebResponse(
        status="success",
        message="Verification email sent successfully"
    )


@router.post("/{user_id}/reset-password", response_model=WebResponse[dict])
def reset_user_password(
    user_id: str,
    password_data: UserPasswordReset,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("update_user")),
):
    """
    Reset user password (admin only).
    """
    user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    user.password = get_password_hash(password_data.password)
    user.updated_by = current_user.id
    db.commit()
    
    return WebResponse(
        status="success",
        message="Password reset successfully"
    )


@router.post("/{user_id}/impersonate", response_model=WebResponse[dict])
def impersonate_user(
    user_id: str,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Impersonate a user (superadmin only).
    Creates a new token with the impersonated user's identity while preserving the original admin's ID.
    """
    # Check if current user is superadmin
    if not has_superadmin_role(current_user, db):
        raise ForbiddenException("Only superadmin can impersonate users")
    
    # Get target user to impersonate
    target_user = db.query(User).filter(
        User.id == user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not target_user:
        raise NotFoundException(f"User with ID {user_id} not found")
    
    # Prevent impersonating superadmin
    if has_superadmin_role(target_user, db):
        raise ForbiddenException("Cannot impersonate superadmin users")
    
    # Create impersonation token
    # Store original user info in token for later restoration
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    # Token contains target user's identity but original user's ID for tracking
    access_token = create_access_token(
        data={
            "sub": target_user.username,  # Target user's username
            "user_id": target_user.id,  # Target user's ID
            "original_user_id": current_user.id,  # Original admin's ID
            "original_username": current_user.username,  # Original admin's username
            "is_impersonating": True  # Flag to indicate impersonation
        },
        expires_delta=access_token_expires
    )

    refresh_token = create_refresh_token(
        {
            "sub": target_user.username,
            "user_id": target_user.id,
            "original_user_id": current_user.id,
            "original_username": current_user.username,
            "is_impersonating": True,
        }
    )
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    # Set access token in HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/"
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
    
    # Eager load roles and permissions
    db.refresh(target_user, ["roles"])
    for role in target_user.roles:
        db.refresh(role, ["permissions"])
    
    return WebResponse(
        status="success",
        message="Impersonation started successfully",
        data={
            "user": UserRead.model_validate(target_user),
            "impersonated_by": {
                "id": current_user.id,
                "username": current_user.username,
                "email": current_user.email
            }
        }
    )


@router.post("/stop-impersonate", response_model=WebResponse[dict])
def stop_impersonate(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Stop impersonation and return to original admin user.
    """
    # Get token from cookie
    token = request.cookies.get("access_token")
    if not token:
        raise BadRequestException("No active session found")
    
    # Decode token to get original user info
    payload = decode_access_token(token)
    if not payload or not payload.get("is_impersonating"):
        raise BadRequestException("Not currently impersonating any user")
    
    original_user_id = payload.get("original_user_id")
    original_username = payload.get("original_username")
    
    if not original_user_id or not original_username:
        raise BadRequestException("Invalid impersonation session")
    
    # Get original admin user
    original_user = db.query(User).filter(
        User.id == original_user_id,
        User.deleted_at.is_(None)
    ).first()
    
    if not original_user:
        raise NotFoundException("Original admin user not found")
    
    # Create new token for original admin
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    max_age = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60
    
    access_token = create_access_token(
        data={
            "sub": original_user.username,
            "user_id": original_user.id
        },
        expires_delta=access_token_expires
    )

    refresh_token = create_refresh_token(
        {"sub": original_user.username, "user_id": original_user.id}
    )
    refresh_max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60

    # Set access token in HttpOnly cookie
    response.set_cookie(
        key="access_token",
        value=access_token,
        max_age=max_age,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/"
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
    
    # Eager load roles and permissions
    db.refresh(original_user, ["roles"])
    for role in original_user.roles:
        db.refresh(role, ["permissions"])
    
    return WebResponse(
        status="success",
        message="Impersonation stopped successfully",
        data={
            "user": UserRead.model_validate(original_user),
            "redirect_url": "/users"  # Default redirect URL
        }
    )


