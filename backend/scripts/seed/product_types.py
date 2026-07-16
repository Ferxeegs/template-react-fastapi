"""Seed: product_types table."""
from sqlalchemy.orm import Session

from app.models.purchasing import ProductType


def seed_product_types(db: Session) -> None:
    """Initialize product types."""
    print("Sedang melakukan seeding product_types...")

    default_types = [
        {"name": "Barang", "description": "Physical items"},
        {"name": "Jasa", "description": "Non-physical services"},
    ]

    for dt in default_types:
        existing_type = db.query(ProductType).filter(ProductType.name == dt["name"]).first()
        if not existing_type:
            pt = ProductType(name=dt["name"], description=dt["description"], is_active=True)
            db.add(pt)
            db.flush()
            print(f'✓ Product Type "{dt["name"]}" berhasil dibuat')
        else:
            print(f'✓ Product Type "{dt["name"]}" sudah ada, dilewati')

    db.commit()
