"""Seed: delivery_statuses table."""
from sqlalchemy.orm import Session

from app.models.procurement import DeliveryStatus


def seed_delivery_statuses(db: Session) -> None:
    """Initialize delivery statuses."""
    print("Sedang melakukan seeding delivery_statuses...")

    defaults = [
        "Diproses",
        "Diterima",
        "Dibatalkan",
    ]

    for name in defaults:
        existing = db.query(DeliveryStatus).filter(DeliveryStatus.name == name).first()
        if not existing:
            db.add(DeliveryStatus(name=name, is_active=True))
            db.flush()
            print(f'✓ Delivery Status "{name}" berhasil dibuat')
        else:
            existing.is_active = True
            print(f'✓ Delivery Status "{name}" sudah ada, diaktifkan')

    db.query(DeliveryStatus).filter(
        ~DeliveryStatus.name.in_(defaults)
    ).update({DeliveryStatus.is_active: False}, synchronize_session=False)

    db.commit()
