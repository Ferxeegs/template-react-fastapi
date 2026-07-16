"""Seed: purchase_types table."""
from sqlalchemy.orm import Session

from app.models.procurement import PurchaseType


def seed_purchase_types(db: Session) -> None:
    """Initialize purchase types."""
    print("Sedang melakukan seeding purchase_types...")

    defaults = [
        {"name": "Pembelian Bahan Baku", "description": "Pengadaan barang fisik / inventori"},
        {"name": "Pengadaan Barang", "description": "Pengadaan jasa atau layanan"},
        {"name": "Perawatan Store", "description": "Kebutuhan operasional rutin"},
    ]

    for row in defaults:
        existing = db.query(PurchaseType).filter(PurchaseType.name == row["name"]).first()
        if not existing:
            db.add(PurchaseType(**row, is_active=True))
            db.flush()
            print(f'✓ Purchase Type "{row["name"]}" berhasil dibuat')
        else:
            print(f'✓ Purchase Type "{row["name"]}" sudah ada, dilewati')

    db.commit()
