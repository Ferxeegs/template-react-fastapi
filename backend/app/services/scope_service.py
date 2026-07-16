"""
Role scope helpers — filter data by unit access from role_has_scope.
"""
from typing import Optional

from sqlalchemy import false, select
from sqlalchemy.orm import Query, Session

from app.core.exceptions import ForbiddenException, NotFoundException
from app.models.auth import Role, User, user_roles
from app.models.role_scope import RoleHasScope


def is_superadmin(db: Session, user: User) -> bool:
    return user_has_role(db, user, "superadmin")


def user_has_role(db: Session, user: User, role_name: str) -> bool:
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        return False
    row = db.execute(
        select(user_roles.c.user_id).where(
            user_roles.c.user_id == user.id,
            user_roles.c.role_id == role.id,
        )
    ).first()
    return row is not None


def get_accessible_unit_ids(db: Session, user: User) -> Optional[set[str]]:
    """
    Union scope dari semua assignment role user.
    None = superadmin (tanpa filter).
    Empty set = tidak punya scope (tidak ada akses data).
    """
    if is_superadmin(db, user):
        return None

    ur_rows = db.execute(
        select(user_roles.c.id).where(user_roles.c.user_id == user.id)
    ).fetchall()
    user_role_ids = [r[0] for r in ur_rows]
    if not user_role_ids:
        return set()

    scopes = (
        db.query(RoleHasScope.scope_id)
        .filter(RoleHasScope.user_role_id.in_(user_role_ids))
        .distinct()
        .all()
    )
    return {s[0] for s in scopes}


def user_can_access_unit(db: Session, user: User, unit_id: Optional[str]) -> bool:
    if is_superadmin(db, user):
        return True
    if not unit_id:
        return False
    unit_ids = get_accessible_unit_ids(db, user)
    if unit_ids is None:
        return True
    return unit_id in unit_ids


def require_unit_access(
    db: Session,
    user: User,
    unit_id: Optional[str],
    *,
    not_found_message: str = "Resource tidak ditemukan",
) -> None:
    if not user_can_access_unit(db, user, unit_id):
        raise NotFoundException(not_found_message)


def require_unit_access_forbidden(
    db: Session,
    user: User,
    unit_id: Optional[str],
    *,
    message: str = "Tidak memiliki akses ke unit ini",
) -> None:
    if not user_can_access_unit(db, user, unit_id):
        raise ForbiddenException(message)


def apply_unit_scope_filter(query: Query, unit_column, db: Session, user: User) -> Query:
    unit_ids = get_accessible_unit_ids(db, user)
    if unit_ids is None:
        return query
    if not unit_ids:
        return query.filter(false())
    return query.filter(unit_column.in_(unit_ids))
