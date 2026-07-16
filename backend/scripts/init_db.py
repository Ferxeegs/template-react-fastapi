"""
Initialize database with initial data.
Run this script after migrations to seed the database.
"""
import sys
import traceback
from pathlib import Path

# Add parent directory (backend) to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session

from app.db.base_class import Base
from app.db.session import SessionLocal, engine

# Import all models to ensure they are registered with Base.metadata
from app.models import *  # noqa: F401, F403

from scripts.seed import run_all_seeds


def main():
    print("=" * 60)
    print("Initializing database...")
    print("=" * 60)

    try:
        print("Sedang menyelaraskan tabel database...")
        Base.metadata.create_all(bind=engine)
        print("✓ Tabel database siap!")
        print()
    except Exception as e:
        print(f"✗ Gagal membuat tabel: {e}")
        sys.exit(1)

    db: Session = SessionLocal()
    try:
        run_all_seeds(db)

        print("=" * 60)
        print("✓ Seeding selesai!")
        print("=" * 60)
    except Exception as e:
        print(f"\n✗ Error saat seeding: {e}")
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
