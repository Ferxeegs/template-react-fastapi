"""
API v1 endpoints.
"""
from app.api.v1.endpoints import (
    auth,
    users,
    roles,
    settings,
    media,
    units,
    role_scopes,
    dashboard,
)

__all__ = [
    "auth",
    "users",
    "roles",
    "settings",
    "media",
    "units",
    "role_scopes",
    "dashboard",
]
