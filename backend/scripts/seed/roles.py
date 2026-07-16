"""Seed: roles table."""
from sqlalchemy.orm import Session

from app.models.auth import Role


def seed_roles(db: Session) -> None:
    """Initialize roles."""
    print("Sedang melakukan seeding roles...")

    roles = [
        {"name": "superadmin", "guard_name": "web"},
        {"name": "auditor", "guard_name": "web"},
    ]

    for role_data in roles:
        existing_role = db.query(Role).filter(Role.name == role_data["name"]).first()
        if not existing_role:
            role = Role(**role_data)
            db.add(role)
            db.flush()
            print(f'✓ Role "{role_data["name"]}" berhasil dibuat')
        else:
            print(f'✓ Role "{role_data["name"]}" sudah ada, dilewati')

    db.commit()
