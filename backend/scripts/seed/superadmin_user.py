"""Seed: users table (superadmin from environment)."""
import os

from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.models.auth import Permission, Role, User


def seed_superadmin_user(db: Session) -> None:
    """Initialize superadmin user from environment variables."""
    print("Sedang melakukan seeding superadmin user...")

    admin_username = os.getenv("INIT_ADMIN_USERNAME", "superadmin")
    admin_email = os.getenv("INIT_ADMIN_EMAIL", "superadmin@local.com")
    admin_password = os.getenv("INIT_ADMIN_PASSWORD", "12341234")
    admin_firstname = os.getenv("INIT_ADMIN_FIRSTNAME", "Super")
    admin_lastname = os.getenv("INIT_ADMIN_LASTNAME", "Admin")

    if not admin_password:
        raise ValueError("INIT_ADMIN_PASSWORD tidak boleh kosong")

    if admin_password.startswith("$2") and len(admin_password) >= 59:
        print("⚠️  Warning: Password dari environment variable terdeteksi sebagai hash.")
        print("   Menggunakan password tersebut langsung tanpa hashing ulang.")
        hashed_password = admin_password
    else:
        try:
            hashed_password = get_password_hash(admin_password)
        except ValueError as e:
            print(f"✗ Error saat hashing password: {e}")
            raise

    existing_superadmin = db.query(User).filter(
        (User.email == admin_email) | (User.username == admin_username)
    ).first()

    if not existing_superadmin:
        superadmin = User(
            username=admin_username,
            email=admin_email,
            firstname=admin_firstname,
            lastname=admin_lastname,
            fullname=f"{admin_firstname} {admin_lastname}",
            password=hashed_password
        )
        db.add(superadmin)
        db.flush()

        superadmin_role = db.query(Role).filter(Role.name == "superadmin").first()
        if superadmin_role:
            superadmin.roles.append(superadmin_role)
            db.commit()

            db.refresh(superadmin, ["roles"])
            db.refresh(superadmin_role, ["permissions"])

            permission_count = len(superadmin_role.permissions) if superadmin_role.permissions else 0
            print("✓ Superadmin user berhasil dibuat dengan role superadmin")
            print(f"  Email: {admin_email}")
            print(f"  Username: {admin_username}")
            print(f"  Password: {admin_password}")
            print(f"  Role: superadmin (dengan {permission_count} permissions)")
            print("⚠️  WARNING: Please change the default password after first login!")
        else:
            db.commit()
            print("⚠️  Warning: Role superadmin tidak ditemukan, user dibuat tanpa role")
    else:
        superadmin_role = db.query(Role).filter(Role.name == "superadmin").first()
        if superadmin_role:
            if superadmin_role not in existing_superadmin.roles:
                existing_superadmin.roles.append(superadmin_role)
                db.commit()
                print("✓ Role superadmin berhasil di-assign ke user yang sudah ada")

            db.refresh(existing_superadmin, ["roles"])
            db.refresh(superadmin_role, ["permissions"])

            all_perms_list = db.query(Permission).filter(Permission.guard_name == "web").all()
            if all_perms_list:
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

                permission_count = len(superadmin_role.permissions) if superadmin_role.permissions else 0
                print(f"✓ Superadmin user sudah ada dengan role superadmin (memiliki {permission_count} permissions)")
            else:
                print("✓ Superadmin user sudah ada, tetapi tidak ada permissions yang ditemukan")
        else:
            print("✓ Superadmin user sudah ada, tetapi role superadmin tidak ditemukan")
