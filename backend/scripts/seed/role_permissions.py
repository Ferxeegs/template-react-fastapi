"""Seed: assign permissions to purchasing workflow roles."""
from sqlalchemy.orm import Session

from app.models.auth import Permission, Role


ROLE_PERMISSIONS: dict[str, list[str]] = {
    "purchasing": [
        "view_unit",
        "view_category",
        "create_category",
        "update_category",
        "delete_category",
        "view_vendor",
        "view_product",
        "create_product",
        "update_product",
        "delete_product",
        "view_uom",
        "create_uom",
        "update_uom",
        "delete_uom",
        "view_purchase_requisition",
        "create_purchase_requisition",
        "update_purchase_requisition",
        "delete_purchase_requisition",
        "submit_purchase_requisition",
        "view_purchase_order",
        "update_purchase_order",
        "update_po_item_delivery_status",
        "update_po_item_qty",
        "view_po_price_variance_report",
        "view_stock",
        "view_stock_movement",
        "create_stock_movement",
    ],
    "brand_manager": [
        "view_purchase_requisition",
        "approve_purchase_requisition",
        "view_purchase_order",
        "update_purchase_order",
        "view_po_price_variance_report",
        "view_stock",
        "view_stock_movement",
    ],
    "finance": [
        "view_purchase_requisition",
        "approve_purchase_requisition",
        "view_purchase_order",
        "update_purchase_order",
        "update_po_item_payment_status",
        "update_po_item_price",
        "view_po_price_variance_report",
    ],
}


def seed_role_permissions(db: Session) -> None:
    """Assign domain permissions to purchasing, brand_manager, and finance roles."""
    print("Sedang melakukan seeding role permissions...")

    for role_name, perm_names in ROLE_PERMISSIONS.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            print(f'⚠️  Role "{role_name}" tidak ditemukan, dilewati')
            continue

        db.refresh(role, ["permissions"])
        existing_ids = {p.id for p in (role.permissions or [])}
        to_add = []

        for perm_name in perm_names:
            perm = db.query(Permission).filter(Permission.name == perm_name).first()
            if not perm:
                print(f'⚠️  Permission "{perm_name}" tidak ditemukan')
                continue
            if perm.id not in existing_ids:
                to_add.append(perm)

        if to_add:
            role.permissions.extend(to_add)
            db.commit()
            print(f'✓ {len(to_add)} permissions di-assign ke role "{role_name}"')
        else:
            print(f'✓ Role "{role_name}" sudah memiliki semua permissions yang diperlukan')
