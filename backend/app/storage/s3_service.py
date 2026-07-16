"""
S3-compatible storage (AWS S3, MinIO). Uses path-style addressing for MinIO.
"""
from __future__ import annotations

import io
from typing import BinaryIO, Iterator

import boto3
from botocore.client import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings


def _client():
    if not settings.S3_ACCESS_KEY_ID or not settings.S3_SECRET_ACCESS_KEY:
        raise RuntimeError("S3 credentials are not configured (S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY).")
    return boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL,
        aws_access_key_id=settings.S3_ACCESS_KEY_ID,
        aws_secret_access_key=settings.S3_SECRET_ACCESS_KEY,
        region_name=settings.S3_REGION,
        use_ssl=settings.S3_USE_SSL,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": settings.S3_ADDRESSING_STYLE},
        ),
    )


def build_object_key(model_type: str, collection: str, stored_filename: str) -> str:
    """Stable object key: {model_type}/{collection}/{stored_filename} (no leading slash)."""
    mt = (model_type or "unknown").strip().lower().replace("\\", "/").strip("/")
    coll = (collection or "default").strip().lower().replace("\\", "/").strip("/")
    name = stored_filename.lstrip("/")
    return f"{mt}/{coll}/{name}"


def put_object_bytes(
    *,
    bucket: str,
    key: str,
    body: bytes,
    content_type: str,
    extra_metadata: dict[str, str] | None = None,
) -> str:
    """
    Upload bytes to bucket. Returns ETag (may include quotes per S3).
    """
    client = _client()
    meta = extra_metadata or {}
    try:
        r = client.put_object(
            Bucket=bucket,
            Key=key,
            Body=io.BytesIO(body),
            ContentType=content_type,
            Metadata={k: str(v)[:2048] for k, v in meta.items()},
        )
        return (r.get("ETag") or "").strip('"')
    except (ClientError, BotoCoreError) as e:
        raise RuntimeError(f"S3 put_object failed: {e}") from e


def delete_object(*, bucket: str, key: str) -> None:
    client = _client()
    try:
        client.delete_object(Bucket=bucket, Key=key)
    except (ClientError, BotoCoreError) as e:
        raise RuntimeError(f"S3 delete_object failed: {e}") from e


def get_object_stream(*, bucket: str, key: str) -> tuple[BinaryIO, str | None, str | None]:
    """
    Returns (body_stream, content_type, content_encoding).
    Caller must close the stream when done.
    """
    client = _client()
    try:
        r = client.get_object(Bucket=bucket, Key=key)
        body = r["Body"]
        ct = r.get("ContentType")
        ce = r.get("ContentEncoding")
        return body, ct, ce
    except (ClientError, BotoCoreError) as e:
        raise RuntimeError(f"S3 get_object failed: {e}") from e


def iter_chunks(stream: BinaryIO, chunk_size: int = 65536) -> Iterator[bytes]:
    while True:
        chunk = stream.read(chunk_size)
        if not chunk:
            break
        yield chunk
