"""Seed: uoms table."""
from sqlalchemy.orm import Session

from app.models.purchasing import Uom


def seed_uoms(db: Session) -> None:
    """Initialize units of measure (uoms)."""
    print("Sedang melakukan seeding uoms...")

    default_uoms = [
        {"name": "Pieces", "shortname": "Pcs"},
        {"name": "Box", "shortname": "Box"},
        {"name": "Kilogram", "shortname": "Kg"},
        {"name": "Liter", "shortname": "Ltr"},
        {"name": "Meter", "shortname": "Mtr"}
    ]

    for du in default_uoms:
        existing_uom = db.query(Uom).filter(Uom.name == du["name"]).first()
        if not existing_uom:
            uom = Uom(name=du["name"], shortname=du["shortname"], is_active=True)
            db.add(uom)
            db.flush()
            print(f'✓ UOM "{du["name"]}" ({du["shortname"]}) berhasil dibuat')
        else:
            print(f'✓ UOM "{du["name"]}" sudah ada, dilewati')

    db.commit()
