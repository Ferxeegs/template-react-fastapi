from typing import List, Union

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_active_user, get_db
from app.models.auth import User


def _user_has_permission(user: User, permission_names: Union[str, List[str]]) -> bool:
    required = [permission_names] if isinstance(permission_names, str) else permission_names
    if user.roles:
        for role in user.roles:
            if getattr(role, "name", None) == "superadmin":
                return True
    names: set[str] = set()
    if user.roles:
        for role in user.roles:
            if getattr(role, "permissions", None):
                for p in role.permissions:
                    names.add(p.name)
    return any(p in names for p in required)


def _load_user_permissions(db: Session, user: User) -> User:
    db.refresh(user, ["roles"])
    for role in user.roles:
        db.refresh(role, ["permissions"])
    return user


def user_has_permission(db: Session, user: User, permission_names: Union[str, List[str]]) -> bool:
    """Check permission after eager-loading roles and permissions."""
    _load_user_permissions(db, user)
    return _user_has_permission(user, permission_names)


def require_permission(permission_names: Union[str, List[str]]):
    def dependency(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        _load_user_permissions(db, current_user)
        if not _user_has_permission(current_user, permission_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency


def require_any_permission(*permission_names: str):
    """Izinkan akses jika user punya salah satu permission."""

    def dependency(
        current_user: User = Depends(get_current_active_user),
        db: Session = Depends(get_db),
    ) -> User:
        _load_user_permissions(db, current_user)
        if not _user_has_permission(current_user, list(permission_names)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user

    return dependency
