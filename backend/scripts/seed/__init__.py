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
from .vendor_statuses import seed_vendor_statuses
from .product_types import seed_product_types
from .uoms import seed_uoms
from .purchase_types import seed_purchase_types
from .delivery_statuses import seed_delivery_statuses
from .payment_statuses import seed_payment_statuses
from .role_permissions import seed_role_permissions


SeedFn = Callable[[Session], None]

# (nama_step, fungsi) — ubah urutan atau hapus baris untuk mengontrol apa yang di-seed
SEED_STEPS: list[tuple[str, SeedFn]] = [
    ("roles", seed_roles),
    ("permissions", seed_permissions),
    ("superadmin_user", seed_superadmin_user),
    ("settings", seed_settings),
    ("vendor_statuses", seed_vendor_statuses),
    ("product_types", seed_product_types),
    ("uoms", seed_uoms),
    ("purchase_types", seed_purchase_types),
    ("delivery_statuses", seed_delivery_statuses),
    ("payment_statuses", seed_payment_statuses),
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
