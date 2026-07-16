"""Seed: payment_statuses table."""
from sqlalchemy.orm import Session

from app.models.procurement import PaymentStatus


def seed_payment_statuses(db: Session) -> None:
    """Initialize payment statuses."""
    print("Sedang melakukan seeding payment_statuses...")

    defaults = [
        "Belum Dibayar",
        "Lunas",
    ]

    for name in defaults:
        existing = db.query(PaymentStatus).filter(PaymentStatus.name == name).first()
        if not existing:
            db.add(PaymentStatus(name=name, is_active=True))
            db.flush()
            print(f'✓ Payment Status "{name}" berhasil dibuat')
        else:
            existing.is_active = True
            print(f'✓ Payment Status "{name}" sudah ada, diaktifkan')

    db.query(PaymentStatus).filter(
        ~PaymentStatus.name.in_(defaults)
    ).update({PaymentStatus.is_active: False}, synchronize_session=False)

    db.commit()
