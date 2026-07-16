"""
Media persistence helpers (shared by API and domain services).
PO proof uploads are always stored on local disk, never object storage.
"""
from __future__ import annotations

import hashlib
import os
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import BadRequestException
from app.core.logging_config import root_logger
from app.models.common import Media

logger = root_logger

IMAGE_MIME_PREFIX = "image/"


def get_upload_base_path() -> Path:
    upload_base = Path(settings.UPLOAD_DIR)
    if upload_base.is_absolute():
        return upload_base
    try:
        current_file = Path(__file__).resolve()
        backend_dir = current_file.parent.parent.parent
        return backend_dir / upload_base
    except Exception:
        return Path(os.getcwd()) / upload_base


def ensure_upload_dir(model_type: str, collection: str) -> Path:
    upload_dir = get_upload_base_path() / model_type.lower() / collection
    upload_dir.mkdir(parents=True, exist_ok=True)
    return upload_dir


def _remove_local_file(media: Media) -> None:
    if media.url and media.url.startswith("/uploads/"):
        relative_path = media.url[9:]
        file_path = get_upload_base_path().joinpath(*relative_path.split("/"))
        if file_path.exists():
            try:
                file_path.unlink()
            except Exception as e:
                logger.error("Local delete failed %s: %s", file_path, e)


def _validate_image(content_type: str, size: int) -> None:
    if not content_type or not content_type.startswith(IMAGE_MIME_PREFIX):
        raise BadRequestException("Bukti harus berupa file gambar (JPG, PNG, WEBP, dll.)")
    max_upload_size = max(settings.MAX_UPLOAD_SIZE, 5 * 1024 * 1024)
    if size == 0:
        raise BadRequestException("File bukti kosong")
    if size > max_upload_size:
        raise BadRequestException(
            f"Ukuran file melebihi batas {max_upload_size / 1024 / 1024:.0f} MB"
        )


def save_upload_bytes(
    db: Session,
    *,
    content: bytes,
    filename: str,
    content_type: str,
    model_type: str,
    model_id: str,
    collection: str = "proof",
) -> Media:
    _validate_image(content_type, len(content))

    file_ext = Path(filename).suffix if filename else ".jpg"
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    checksum_sha256 = hashlib.sha256(content).hexdigest()
    relative_url = f"/uploads/{model_type.lower()}/{collection}/{unique_filename}"

    upload_dir = ensure_upload_dir(model_type, collection)
    file_path = upload_dir / unique_filename
    with open(file_path, "wb") as f:
        f.write(content)
    if not file_path.exists() or file_path.stat().st_size != len(content):
        raise BadRequestException("Gagal menyimpan file bukti")

    media = Media(
        model_type=model_type,
        model_id=model_id,
        collection=collection,
        url=relative_url,
        file_name=filename or unique_filename,
        name=unique_filename,
        mime_type=content_type or "application/octet-stream",
        size=len(content),
        storage="local",
        checksum_sha256=checksum_sha256,
        bucket=None,
        object_key=None,
    )
    db.add(media)
    db.flush()
    return media


def get_proof_medias(db: Session, log_id: int) -> list[Media]:
    return (
        db.query(Media)
        .filter(
            Media.model_type == "PoStatusLog",
            Media.model_id == str(log_id),
            Media.collection == "proof",
        )
        .order_by(Media.id.asc())
        .all()
    )
