"""Seed: permissions table (+ assign to superadmin role)."""
from sqlalchemy.orm import Session

from app.models.auth import Permission, Role


def seed_permissions(db: Session) -> None:
    """Initialize permissions."""
    print("Sedang melakukan seeding permissions...")

    user_permissions = [
        "view_user",
        "create_user",
        "update_user",
        "delete_user",
        "restore_user",
        "force_delete_user",
    ]

    role_permissions = [
        "view_role",
        "create_role",
        "update_role",
        "delete_role",
    ]

    setting_permissions = [
        "view_setting",
        "create_setting",
        "update_setting",
        "delete_setting",
    ]

    myprofile_permissions = [  
        "view_myprofile",
        "update_myprofile",
    ]

    unit_permissions = [
        "view_unit",
        "create_unit",
        "update_unit",
        "delete_unit",
    ]

    role_scope_permissions = [
        "view_role_scope",
        "update_role_scope",
    ]

    purchasing_permissions = [
        "view_category",
        "create_category",
        "update_category",
        "delete_category",
        "view_vendor",
        "create_vendor",
        "update_vendor",
        "delete_vendor",
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
        "approve_purchase_requisition",
        "view_purchase_order",
        "update_purchase_order",
        "update_po_item_delivery_status",
        "update_po_item_payment_status",
        "update_po_item_price",
        "update_po_item_qty",
        "view_po_price_variance_report",
        "view_stock",
        "view_stock_movement",
        "create_stock_movement",
    ]

    all_permissions = (
        user_permissions
        + role_permissions
        + setting_permissions
        + myprofile_permissions
        + unit_permissions
        + role_scope_permissions
        + purchasing_permissions
    )

    for perm_name in all_permissions:
        existing_perm = db.query(Permission).filter(Permission.name == perm_name).first()
        if not existing_perm:
            perm = Permission(name=perm_name, guard_name="web")
            db.add(perm)
            db.flush()
            print(f'✓ Permission "{perm_name}" berhasil dibuat')
        else:
            print(f'✓ Permission "{perm_name}" sudah ada, dilewati')

    db.commit()

    superadmin_role = db.query(Role).filter(Role.name == "superadmin").first()
    if superadmin_role:
        all_perms_list = db.query(Permission).filter(Permission.guard_name == "web").all()

        if all_perms_list:
            db.refresh(superadmin_role, ["permissions"])

            existing_permission_ids = [perm.id for perm in superadmin_role.permissions]

            permissions_to_assign = [
                perm for perm in all_perms_list
                if perm.id not in existing_permission_ids
            ]

            if permissions_to_assign:
                superadmin_role.permissions.extend(permissions_to_assign)
                db.commit()
                db.refresh(superadmin_role, ["permissions"])
                print(f"✓ {len(permissions_to_assign)} permissions berhasil di-assign ke role superadmin")
            else:
                print("✓ Semua permissions sudah di-assign ke role superadmin")

            db.refresh(superadmin_role, ["permissions"])
            final_count = len(superadmin_role.permissions) if superadmin_role.permissions else 0
            print(f"✓ Role superadmin sekarang memiliki {final_count} permissions")
        else:
            print("⚠️  Warning: Tidak ada permissions yang ditemukan")
    else:
        print("⚠️  Warning: Role superadmin tidak ditemukan")
