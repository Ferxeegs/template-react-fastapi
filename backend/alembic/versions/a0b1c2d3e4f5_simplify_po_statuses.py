"""simplify delivery and payment statuses

Revision ID: a0b1c2d3e4f5
Revises: f9a0b1c2d3e4
Create Date: 2026-06-24

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a0b1c2d3e4f5"
down_revision: Union[str, None] = "f9a0b1c2d3e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_DELIVERY = ["Diproses", "Diterima", "Dibatalkan"]
NEW_PAYMENT = ["Belum Dibayar", "Lunas"]

DELIVERY_MAP = {
    "Menunggu Pengiriman": "Diproses",
    "Dalam Pengiriman": "Diproses",
    "Diterima Sebagian": "Diterima",
    "Diterima Lengkap": "Diterima",
    "Dibatalkan": "Dibatalkan",
}

PAYMENT_MAP = {
    "Belum Bayar": "Belum Dibayar",
    "Sebagian": "Belum Dibayar",
    "Lunas": "Lunas",
    "Dibatalkan": "Belum Dibayar",
}


def _ensure_statuses(conn, table: str, names: list[str]) -> None:
    placeholders = ", ".join(f"'{n}'" for n in names)
    for name in names:
        row = conn.execute(
            sa.text(f"SELECT id FROM {table} WHERE name = :name LIMIT 1"),
            {"name": name},
        ).fetchone()
        if row:
            conn.execute(
                sa.text(f"UPDATE {table} SET is_active = 1 WHERE id = :id"),
                {"id": row[0]},
            )
        else:
            conn.execute(
                sa.text(f"INSERT INTO {table} (name, is_active) VALUES (:name, 1)"),
                {"name": name},
            )
    conn.execute(sa.text(f"UPDATE {table} SET is_active = 0 WHERE name NOT IN ({placeholders})"))


def _status_id_map(conn, table: str) -> dict[str, int]:
    return {
        row[1]: row[0]
        for row in conn.execute(sa.text(f"SELECT id, name FROM {table}")).fetchall()
    }


def _migrate_po_fk(
    conn,
    fk_column: str,
    status_table: str,
    name_map: dict[str, str],
    default_name: str,
) -> None:
    ids = _status_id_map(conn, status_table)
    default_id = ids.get(default_name)
    for old_name, new_name in name_map.items():
        old_id = ids.get(old_name)
        new_id = ids.get(new_name)
        if old_id and new_id and old_id != new_id:
            conn.execute(
                sa.text(
                    f"UPDATE purchase_orders SET {fk_column} = :new_id WHERE {fk_column} = :old_id"
                ),
                {"new_id": new_id, "old_id": old_id},
            )
    if default_id:
        conn.execute(
            sa.text(
                f"""
                UPDATE purchase_orders po
                LEFT JOIN {status_table} ds ON po.{fk_column} = ds.id
                SET po.{fk_column} = :default_id
                WHERE ds.id IS NULL OR ds.is_active = 0
                """
            ),
            {"default_id": default_id},
        )


def upgrade() -> None:
    conn = op.get_bind()
    _ensure_statuses(conn, "delivery_statuses", NEW_DELIVERY)
    _ensure_statuses(conn, "payment_statuses", NEW_PAYMENT)
    _migrate_po_fk(conn, "delivery_status_id", "delivery_statuses", DELIVERY_MAP, "Diproses")
    _migrate_po_fk(conn, "payment_status_id", "payment_statuses", PAYMENT_MAP, "Belum Dibayar")

    delivery_ids = _status_id_map(conn, "delivery_statuses")
    payment_ids = _status_id_map(conn, "payment_statuses")
    for old_name, new_name in DELIVERY_MAP.items():
        if old_name in delivery_ids and new_name in delivery_ids:
            conn.execute(
                sa.text(
                    """
                    UPDATE po_status_logs
                    SET status_id = :new_id, status_name = :new_name
                    WHERE status_type = 'delivery' AND status_name = :old_name
                    """
                ),
                {
                    "new_id": delivery_ids[new_name],
                    "new_name": new_name,
                    "old_name": old_name,
                },
            )
    for old_name, new_name in PAYMENT_MAP.items():
        if old_name in payment_ids and new_name in payment_ids:
            conn.execute(
                sa.text(
                    """
                    UPDATE po_status_logs
                    SET status_id = :new_id, status_name = :new_name
                    WHERE status_type = 'payment' AND status_name = :old_name
                    """
                ),
                {
                    "new_id": payment_ids[new_name],
                    "new_name": new_name,
                    "old_name": old_name,
                },
            )


def downgrade() -> None:
    pass
