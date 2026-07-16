"""Seed: assign permissions to roles (extend as needed for your domain)."""
from sqlalchemy.orm import Session

from app.models.auth import Permission, Role


ROLE_PERMISSIONS: dict[str, list[str]] = {
    # Example:
    # "auditor": ["view_user", "view_role", "view_unit"],
}


def seed_role_permissions(db: Session) -> None:
    """Assign permissions listed in ROLE_PERMISSIONS to matching roles."""
    print("Sedang melakukan seeding role permissions...")

    if not ROLE_PERMISSIONS:
        print("✓ ROLE_PERMISSIONS kosong — tidak ada assignment tambahan")
        return

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
