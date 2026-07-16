"""Seed: settings table."""
import os

from sqlalchemy.orm import Session

from app.models.common import Setting


def seed_settings(db: Session) -> None:
    """Initialize default settings."""
    print("Sedang melakukan seeding settings...")

    default_settings = [
        {
            "group": "general",
            "name": "site_name",
            "payload": "Purchasing Go",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "site_tagline",
            "payload": "Sistem Manajemen Pengadaan Barang Terpadu",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "site_description",
            "payload": "Aplikasi manajemen pengadaan barang — dari permintaan hingga penerimaan.",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "company_name",
            "payload": "Your Company",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "company_email",
            "payload": "app@local.com",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "company_phone",
            "payload": "+621234567890",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "company_address",
            "payload": "Jl. Contoh No. 123, Kota, Provinsi",
            "locked": 0,
        },
        {
            "group": "general",
            "name": "copyright_text",
            "payload": f"© 2026 {os.getenv('PROJECT_NAME', 'Your App')}. All rights reserved.",
            "locked": 0,
        },
        {
            "group": "appearance",
            "name": "site_logo",
            "payload": "",
            "locked": 0,
        },
        {
            "group": "appearance",
            "name": "site_logo_dark",
            "payload": "",
            "locked": 0,
        },
        {
            "group": "appearance",
            "name": "brand_logo_square",
            "payload": "",
            "locked": 0,
        },
        {
            "group": "appearance",
            "name": "brand_logo_square_dark",
            "payload": "",
            "locked": 0,
        },
        {
            "group": "appearance",
            "name": "site_favicon",
            "payload": "",
            "locked": 0,
        },
    ]

    for setting_data in default_settings:
        existing_setting = db.query(Setting).filter(
            Setting.group == setting_data["group"],
            Setting.name == setting_data["name"]
        ).first()

        if not existing_setting:
            setting = Setting(**setting_data)
            db.add(setting)
            db.flush()
            print(f'✓ Setting "{setting_data["group"]}.{setting_data["name"]}" berhasil dibuat')
        else:
            print(f'✓ Setting "{setting_data["group"]}.{setting_data["name"]}" sudah ada, dilewati')

    db.commit()
