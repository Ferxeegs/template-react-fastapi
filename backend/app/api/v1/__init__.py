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
    categories,
    uoms,
    vendors,
    products,
    purchase_requisitions,
    purchase_orders,
    inventory,
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
    categories.router,
    prefix="/categories",
    tags=["Categories"],
    dependencies=_auth_required,
)
api_router.include_router(
    uoms.router,
    prefix="/uoms",
    tags=["Units of Measure"],
    dependencies=_auth_required,
)
api_router.include_router(
    vendors.router,
    prefix="/vendors",
    tags=["Vendors"],
    dependencies=_auth_required,
)
api_router.include_router(
    products.router,
    prefix="/products",
    tags=["Products"],
    dependencies=_auth_required,
)
api_router.include_router(
    purchase_requisitions.router,
    prefix="/purchase-requisitions",
    tags=["Purchase Requisitions"],
    dependencies=_auth_required,
)
api_router.include_router(
    purchase_orders.router,
    prefix="/purchase-orders",
    tags=["Purchase Orders"],
    dependencies=_auth_required,
)
api_router.include_router(
    inventory.router,
    prefix="/inventory",
    tags=["Inventory"],
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

