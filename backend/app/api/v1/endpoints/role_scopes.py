from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.api.deps import get_db, require_permission
from app.models.auth import User, Role, user_roles
from app.models.role_scope import RoleHasScope
from app.models.unit import Unit
from app.schemas.role_scope import UserRoleScopeRead, RoleScopeUpdate
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, BadRequestException

router = APIRouter()

@router.get("/", response_model=WebResponse[dict])
def list_role_scopes(
    page: int = 1,
    limit: int = 10,
    search: str = None,
    has_scope: bool = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_role_scope")),
):
    """
    Get paginated list of all user-role assignments with their active scopes (units).
    """
    scoped_user_role_ids = db.query(RoleHasScope.user_role_id).distinct().subquery()

    query = db.query(
        user_roles.c.id.label("user_role_id"),
        user_roles.c.user_id,
        user_roles.c.role_id,
        User.username,
        User.fullname,
        User.created_at.label("created_at"),
        Role.name.label("role_name")
    ).join(User, User.id == user_roles.c.user_id)\
     .join(Role, Role.id == user_roles.c.role_id)\
     .filter(User.deleted_at.is_(None))

    if has_scope is True:
        query = query.filter(user_roles.c.id.in_(scoped_user_role_ids))
    elif has_scope is False:
        query = query.filter(user_roles.c.id.not_in(scoped_user_role_ids))

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (User.username.ilike(search_filter)) |
            (User.fullname.ilike(search_filter)) |
            (Role.name.ilike(search_filter))
        )

    total = query.count()
    offset = (page - 1) * limit
    assignments = query.offset(offset).limit(limit).all()

    results = []
    for ass in assignments:
        # Fetch scopes
        scopes_rel = db.query(RoleHasScope).filter(RoleHasScope.user_role_id == ass.user_role_id).all()
        scopes = []
        for sr in scopes_rel:
            unit = db.query(Unit).filter(Unit.id == sr.scope_id).first()
            if unit:
                scopes.append({"id": unit.id, "name": unit.name})
        
        results.append({
            "user_role_id": ass.user_role_id,
            "user_id": ass.user_id,
            "username": ass.username,
            "fullname": ass.fullname,
            "created_at": ass.created_at,
            "role_id": ass.role_id,
            "role_name": ass.role_name,
            "scopes": scopes
        })

    return WebResponse(
        status="success",
        data={
            "role_scopes": results,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit
            }
        }
    )

@router.get("/user/{user_id}", response_model=WebResponse[List[UserRoleScopeRead]])
def get_user_role_scopes(
    user_id: str,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_role_scope")),
):
    """
    Get all role-scope mappings for a specific user.
    """
    # Verify user exists
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if not user:
        raise NotFoundException(f"User with ID {user_id} not found")

    # Get user role assignments
    stmt = user_roles.select().where(user_roles.c.user_id == user_id)
    user_role_assignments = db.execute(stmt).all()

    result = []
    for ura in user_role_assignments:
        role = db.query(Role).filter(Role.id == ura.role_id).first()
        if not role:
            continue
        
        # Get assigned scopes (units) for this user_role_id
        scopes_rel = db.query(RoleHasScope).filter(RoleHasScope.user_role_id == ura.id).all()
        scopes = []
        for sr in scopes_rel:
            unit = db.query(Unit).filter(Unit.id == sr.scope_id).first()
            if unit:
                scopes.append({"id": unit.id, "name": unit.name})

        result.append(
            UserRoleScopeRead(
                user_role_id=ura.id,
                role_id=ura.role_id,
                role_name=role.name,
                created_at=user.created_at,
                scopes=scopes
            )
        )

    return WebResponse(status="success", data=result)

@router.put("/{user_role_id}", response_model=WebResponse[None])
def update_role_scopes(
    user_role_id: int,
    data: RoleScopeUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_role_scope")),
):
    """
    Update the scopes (units/departments) assigned to a user role mapping.
    """
    # Verify user_role assignment exists
    stmt = user_roles.select().where(user_roles.c.id == user_role_id)
    ura = db.execute(stmt).first()
    if not ura:
        raise NotFoundException(f"User role assignment with ID {user_role_id} not found")

    # Verify all scope_ids exist
    if data.scope_ids:
        units_count = db.query(Unit).filter(Unit.id.in_(data.scope_ids)).count()
        if units_count != len(data.scope_ids):
            raise BadRequestException("One or more Scope IDs are invalid")

    # Delete existing scopes
    db.query(RoleHasScope).filter(RoleHasScope.user_role_id == user_role_id).delete()

    # Insert new scopes
    for scope_id in data.scope_ids:
        new_scope = RoleHasScope(user_role_id=user_role_id, scope_id=scope_id)
        db.add(new_scope)

    db.commit()
    return WebResponse(status="success", message="Role scopes updated successfully")
