"""
Role management endpoints.
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.api.deps import get_db, require_permission
from app.models.auth import Role, Permission, User, role_has_permissions, user_roles
from app.schemas.role import (
    RoleRead, RoleDetailRead, RoleUpdate, RolePermissionUpdate
)
from app.schemas.common import WebResponse
from app.core.exceptions import NotFoundException, BadRequestException, ConflictException

router = APIRouter()


@router.get("/", response_model=WebResponse[dict])
def get_all_roles(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_role")),
):
    """
    Get all roles with pagination and search.
    """
    query = db.query(Role)
    
    if search:
        search_filter = or_(
            Role.name.ilike(f"%{search}%"),
            Role.guard_name.ilike(f"%{search}%")
        )
        query = query.filter(search_filter)
    
    total = query.count()
    offset = (page - 1) * limit
    roles = query.offset(offset).limit(limit).all()
    
    # Eager load permissions and count users
    for role in roles:
        db.refresh(role, ["permissions"])
        # Count users with this role
        role.users_count = db.query(func.count(user_roles.c.user_id)).filter(
            user_roles.c.role_id == role.id
        ).scalar() or 0
        role.permissions_count = len(role.permissions)
    
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return WebResponse(
        status="success",
        data={
            "roles": [RoleRead.model_validate(role) for role in roles],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": total_pages
            }
        }
    )


@router.get("/permissions", response_model=WebResponse[dict])
def get_all_permissions(
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_role")),
):
    """
    Get all permissions.
    PENTING: Route ini harus didefinisikan SEBELUM /{role_id} agar "permissions" tidak dianggap sebagai role_id.
    """
    permissions = db.query(Permission).order_by(Permission.name).all()
    
    from app.schemas.role import PermissionRead
    
    return WebResponse(
        status="success",
        data={"permissions": [PermissionRead.model_validate(p) for p in permissions]}
    )


@router.get("/{role_id}", response_model=WebResponse[RoleDetailRead])
def get_role_by_id(
    role_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("view_role")),
):
    """
    Get role by ID with details.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    
    if not role:
        raise NotFoundException(f"Role with ID {role_id} not found")
    
    # Refresh permissions, tapi jangan refresh users karena akan menyebabkan konflik dengan RoleDetailRead
    # RoleDetailRead mengharapkan users sebagai List[dict], bukan List[User]
    db.refresh(role, ["permissions"])
    
    # Set users_count dan permissions_count ke role object untuk RoleRead validation
    role.users_count = db.query(func.count(user_roles.c.user_id)).filter(
        user_roles.c.role_id == role.id
    ).scalar() or 0
    role.permissions_count = len(role.permissions)
    
    # Get users with this role
    users = db.query(User).join(user_roles).filter(
        user_roles.c.role_id == role.id,
        User.deleted_at.is_(None)
    ).all()
    
    # Buat RoleDetailRead dari RoleRead terlebih dahulu
    # RoleRead akan menggunakan users_count dan permissions_count yang sudah di-set
    role_read = RoleRead.model_validate(role)
    
    # Buat RoleDetailRead dengan menambahkan users list
    role_detail = RoleDetailRead(
        **role_read.model_dump(),
        users=[
            {
                "id": user.id,
                "username": user.username,
                "email": user.email,
                "fullname": user.fullname or f"{user.firstname} {user.lastname}".strip()
            }
            for user in users
        ]
    )
    
    return WebResponse(
        status="success",
        data=role_detail
    )


@router.put("/{role_id}", response_model=WebResponse[RoleRead])
def update_role(
    role_id: int,
    role_update: RoleUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_role")),
):
    """
    Update role details (name and guard_name).
    Note: Usually roles are created via migrations/seeding, but this allows updates.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    
    if not role:
        raise NotFoundException(f"Role with ID {role_id} not found")
    
    update_data = role_update.model_dump(exclude_unset=True)
    
    # Check name uniqueness if updating name
    if "name" in update_data and update_data["name"] != role.name:
        existing_role = db.query(Role).filter(
            Role.name == update_data["name"],
            Role.id != role_id
        ).first()
        if existing_role:
            raise ConflictException(f"Role name '{update_data['name']}' already exists")
    
    for field, value in update_data.items():
        setattr(role, field, value)
    
    db.commit()
    db.refresh(role, ["permissions"])
    
    role.permissions_count = len(role.permissions)
    role.users_count = db.query(func.count(user_roles.c.user_id)).filter(
        user_roles.c.role_id == role.id
    ).scalar() or 0
    
    return WebResponse(
        status="success",
        message="Role updated successfully",
        data=RoleRead.model_validate(role)
    )


@router.put("/{role_id}/permissions", response_model=WebResponse[dict])
def update_role_permissions(
    role_id: int,
    permission_update: RolePermissionUpdate,
    db: Session = Depends(get_db),
    _current_user: User = Depends(require_permission("update_role")),
):
    """
    Update role permissions.
    """
    role = db.query(Role).filter(Role.id == role_id).first()
    
    if not role:
        raise NotFoundException(f"Role with ID {role_id} not found")
    
    # Validate permission IDs
    if permission_update.permission_ids:
        permissions = db.query(Permission).filter(
            Permission.id.in_(permission_update.permission_ids)
        ).all()
        
        if len(permissions) != len(permission_update.permission_ids):
            raise BadRequestException("One or more permission IDs are invalid")
        
        role.permissions = permissions
    else:
        role.permissions = []
    
    db.commit()
    db.refresh(role, ["permissions"])
    
    from app.schemas.role import PermissionRead
    
    return WebResponse(
        status="success",
        message="Role permissions updated successfully",
        data={"permissions": [PermissionRead.model_validate(p) for p in role.permissions]}
    )

