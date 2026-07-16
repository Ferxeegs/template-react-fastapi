"""
API dependencies (re-export from core for convenience).
"""
from app.core.dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_optional_active_user,
)
from app.core.deps_permission import require_permission, require_any_permission, user_has_permission

__all__ = [
    "get_db",
    "get_current_user",
    "get_current_active_user",
    "get_optional_active_user",
    "require_permission",
    "require_any_permission",
    "user_has_permission",
]

