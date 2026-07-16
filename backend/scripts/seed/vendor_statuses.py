"""Seed: vendor_statuses table."""
from sqlalchemy.orm import Session

from app.models.purchasing import VendorStatus


def seed_vendor_statuses(db: Session) -> None:
    """Initialize vendor statuses."""
    print("Sedang melakukan seeding vendor_statuses...")

    default_names = ["Active", "Inactive", "Blacklisted"]

    for name in default_names:
        existing_status = db.query(VendorStatus).filter(VendorStatus.status_name == name).first()
        if not existing_status:
            vs = VendorStatus(status_name=name)
            db.add(vs)
            db.flush()
            print(f'✓ Vendor Status "{name}" berhasil dibuat')
        else:
            print(f'✓ Vendor Status "{name}" sudah ada, dilewati')

    db.commit()
