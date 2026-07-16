"""
API v1 routes.
"""
from fastapi import APIRouter, Depends

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
from app.core.dependencies import get_current_active_user

api_router = APIRouter()

_auth_required = [Depends(get_current_active_user)]

# Public auth (login, refresh, optional register)
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])

# Admin / staff — require authenticated session by default
api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
    dependencies=_auth_required,
)
api_router.include_router(
    roles.router,
    prefix="/roles",
    tags=["Roles"],
    dependencies=_auth_required,
)
api_router.include_router(
    units.router,
    prefix="/units",
    tags=["Units"],
    dependencies=_auth_required,
)
api_router.include_router(
    role_scopes.router,
    prefix="/role-scopes",
    tags=["Role Scopes"],
    dependencies=_auth_required,
)
api_router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["Dashboard"],
    dependencies=_auth_required,
)
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])

# Media: public file serve + protected CRUD
api_router.include_router(media.public_router, prefix="/media", tags=["Media"])
api_router.include_router(
    media.router,
    prefix="/media",
    tags=["Media"],
    dependencies=_auth_required,
)

