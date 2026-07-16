#!/bin/bash
set -e

# 1. Tunggu database siap
echo "Menunggu database..."
python /app/scripts/wait_for_db.py

# 2. Jalankan Migrasi (Membuat tabel)
echo "Menjalankan migrasi database..."
# Jika pakai Alembic:
alembic upgrade head
# Jika tanpa Alembic (hanya untuk awal):
# python -c "from app.db.base import Base; from app.db.session import engine; Base.metadata.create_all(bind=engine)"

# 3. Jalankan Seeder
echo "Menjalankan seeder..."
export PYTHONPATH=$PYTHONPATH:/app
python scripts/init_db.py

# 4. Jalankan aplikasi utama
echo "Memulai FastAPI..."
exec "$@"