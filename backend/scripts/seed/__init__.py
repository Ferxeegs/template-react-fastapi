"""
Database seeders: satu modul per tabel / domain.

Urutan eksekusi didefinisikan di ``SEED_STEPS``. File induk ``scripts/init_db.py``
memanggil ``run_all_seeds``; untuk subset step gunakan argumen ``only``.
"""
from collections.abc import Callable, Sequence

from sqlalchemy.orm import Session

from .permissions import seed_permissions
from .roles import seed_roles
from .settings import seed_settings
from .superadmin_user import seed_superadmin_user
from .role_permissions import seed_role_permissions


SeedFn = Callable[[Session], None]

# (nama_step, fungsi) — ubah urutan atau hapus baris untuk mengontrol apa yang di-seed
SEED_STEPS: list[tuple[str, SeedFn]] = [
    ("roles", seed_roles),
    ("permissions", seed_permissions),
    ("superadmin_user", seed_superadmin_user),
    ("settings", seed_settings),
    ("role_permissions", seed_role_permissions),
]


def run_all_seeds(db: Session, *, only: Sequence[str] | None = None) -> None:
    """
    Jalankan fungsi seed secara berurutan.

    Parameters
    ----------
    db
        Sesi SQLAlchemy.
    only
        Jika diisi, hanya nama step yang ada di daftar ini yang dijalankan
        (mis. ``("roles", "permissions")``).
    """
    allowed = set(only) if only is not None else None
    for name, fn in SEED_STEPS:
        if allowed is not None and name not in allowed:
            continue
        fn(db)
        print()
