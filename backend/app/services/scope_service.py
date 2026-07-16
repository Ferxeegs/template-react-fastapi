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


def get_user_scopes_for_role(db: Session, user_id: str, role_name: str) -> list[str]:
    """Scope unit untuk satu role user (digunakan approval per-role)."""
    role = db.query(Role).filter(Role.name == role_name).first()
    if not role:
        return []
    ur_rows = db.execute(
        select(user_roles.c.id).where(
            user_roles.c.user_id == user_id,
            user_roles.c.role_id == role.id,
        )
    ).fetchall()
    user_role_ids = [r[0] for r in ur_rows]
    if not user_role_ids:
        return []
    scopes = (
        db.query(RoleHasScope)
        .filter(RoleHasScope.user_role_id.in_(user_role_ids))
        .all()
    )
    return [s.scope_id for s in scopes]


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


def user_has_scope_for_role_unit(
    db: Session,
    user: User,
    role_name: str,
    unit_id: Optional[str],
    *,
    empty_scope_means_all: bool = False,
) -> bool:
    """
    Cek akses unit untuk role tertentu (approval).
    empty_scope_means_all: jika role tidak punya scope, boleh akses semua unit.
    """
    if is_superadmin(db, user):
        return True
    if not unit_id:
        return False
    scopes = get_user_scopes_for_role(db, user.id, role_name)
    if not scopes:
        return empty_scope_means_all
    return unit_id in scopes


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


def apply_product_scope_filter(query: Query, db: Session, user: User) -> Query:
    from app.models.purchasing import Product, Vendor

    unit_ids = get_accessible_unit_ids(db, user)
    if unit_ids is None:
        return query
    if not unit_ids:
        return query.filter(false())
    return query.filter(
        Product.vendor_id.in_(db.query(Vendor.id).filter(Vendor.unit_id.in_(unit_ids)))
    )


def apply_category_scope_filter(query: Query, db: Session, user: User) -> Query:
    from app.models.purchasing import Category

    return apply_unit_scope_filter(query, Category.unit_id, db, user)


def apply_po_scope_filter(query: Query, db: Session, user: User) -> Query:
    from app.models.procurement import PurchaseOrder, PurchaseRequisition

    unit_ids = get_accessible_unit_ids(db, user)
    if unit_ids is None:
        return query
    if not unit_ids:
        return query.filter(false())
    scoped_pr_ids = (
        db.query(PurchaseRequisition.id)
        .filter(PurchaseRequisition.unit_id.in_(unit_ids))
    )
    return query.filter(PurchaseOrder.pr_id.in_(scoped_pr_ids))
