"""
Media management endpoints.
"""
import hashlib
import os
import uuid
import mimetypes
from pathlib import Path
from typing import Optional, Union
from urllib.parse import unquote
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status, Request, Query, Path as FastApiPath
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.common import Media
from app.schemas.common import WebResponse, MediaRead
from app.core.config import settings
from app.core.exceptions import BadRequestException, NotFoundException
from app.core.logging_config import root_logger
from app.storage.s3_service import build_object_key, delete_object, get_object_stream, iter_chunks, put_object_bytes

router = APIRouter()
public_router = APIRouter()
logger = root_logger

IMAGE_MIME_PREFIX = "image/"
DOCUMENT_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}


def get_upload_base_path() -> Path:
    """Get the base upload directory as absolute path."""
    upload_base = Path(settings.UPLOAD_DIR)
    if upload_base.is_absolute():
        return upload_base
    
    # If relative, make it relative to the backend directory
    # From: backend/app/api/v1/endpoints/media.py
    # To: backend/
    try:
        # Get absolute path of current file
        current_file = Path(__file__).resolve()
        # Go up 5 levels to reach backend/
        backend_dir = current_file.parent.parent.parent.parent.parent
        logger.info(f"Resolved backend_dir: {backend_dir}")
        return backend_dir / upload_base
    except Exception as e:
        logger.error(f"Error resolving backend_dir: {e}")
        # Fallback to simple relative path
        return Path(os.getcwd()) / upload_base


def ensure_upload_dir(model_type: str, collection: str) -> Path:
    """Ensure upload directory exists and return path."""
    upload_base = get_upload_base_path()
    upload_dir = upload_base / model_type.lower() / collection
    upload_dir.mkdir(parents=True, exist_ok=True)
    logger.info(f"Upload directory: {upload_dir} (absolute: {upload_dir.resolve()})")
    return upload_dir


def get_file_path_from_url(url: str) -> Path:
    """Convert URL to file system path."""
    # URL format: /uploads/{model_type}/{collection}/{filename}
    # Remove leading /uploads/ prefix correctly
    if url.startswith('/uploads/'):
        relative_path = url[9:]  # Length of "/uploads/"
    elif url.startswith('uploads/'):
        relative_path = url[8:]  # Length of "uploads/"
    else:
        # Fallback for other paths, but be careful not to strip directory characters
        relative_path = url.lstrip('/')
    
    upload_base = get_upload_base_path()
    norm_rel = relative_path.replace("\\", "/").strip("/")
    parts = [p for p in norm_rel.split("/") if p and p != "."]
    file_path = upload_base.joinpath(*parts) if parts else upload_base

    logger.info(f"URL: {url} -> Relative path: {relative_path}")
    logger.info(f"Upload base: {upload_base} (absolute: {upload_base.resolve()})")
    logger.info(f"File path: {file_path} (absolute: {file_path.resolve()})")
    logger.info(f"File exists: {file_path.exists()}")
    
    return file_path


def _is_allowed_upload(content_type: str, model_type: str, collection: str) -> bool:
    normalized_model = (model_type or "").strip().lower()
    normalized_collection = (collection or "").strip().lower()

    # Default: image-only upload for backward compatibility
    if content_type.startswith(IMAGE_MIME_PREFIX):
        return True

    # Document module allows document attachments (pdf/doc/docx)
    if normalized_model == "document" and normalized_collection in {"legal_basis", "default"}:
        return content_type in DOCUMENT_MIME_TYPES

    return False


def _remove_stored_bytes(media: Media) -> None:
    """Remove underlying bytes for a media row (local file or S3 object)."""
    if getattr(media, "storage", None) == "s3" and media.bucket and media.object_key and settings.S3_ENABLED:
        try:
            delete_object(bucket=media.bucket, key=media.object_key)
            logger.info("Deleted S3 object %s/%s", media.bucket, media.object_key)
        except Exception as e:
            logger.error("S3 delete failed for %s/%s: %s", media.bucket, media.object_key, e)
        return
    path = get_file_path_from_url(media.url)
    if path.exists():
        try:
            path.unlink()
            logger.info("Deleted local file %s", path)
        except Exception as e:
            logger.error("Local delete failed %s: %s", path, e)


async def resolve_uploads_response(
    request: Request,
    db: Session,
    ref_type: str,
    collection: str,
    filename: str,
) -> Union[FileResponse, StreamingResponse]:
    """
    Resolve /uploads/{model}/{collection}/{file} and API /serve/... : local disk first, then S3 via `media` row.
    """
    try:
        decoded_filename = unquote(filename)

        logger.info(f"Serve request: model_type={ref_type}, collection={collection}, filename={filename}")
        logger.info(f"Decoded filename: {decoded_filename}")
        logger.info(f"Request URL: {request.url}")

        upload_base = get_upload_base_path()
        file_path = (upload_base / ref_type.lower() / collection / decoded_filename).resolve()

        logger.info(f"Upload base: {upload_base} (absolute: {upload_base.resolve()})")
        logger.info(f"Looking for file at: {file_path}")

        resolved_path = file_path.resolve() if file_path.parent.exists() else file_path
        logger.info(f"Resolved path exists: {resolved_path.exists()} ({resolved_path})")

        if not file_path.exists():
            alt_file_path = (upload_base / ref_type.lower() / collection / filename).resolve()
            logger.info(f"Trying original filename: {alt_file_path} (absolute: {alt_file_path.resolve()})")
            logger.info(f"Original filename exists: {alt_file_path.exists()}")
            if alt_file_path.exists():
                file_path = alt_file_path
            else:
                alt_path = get_file_path_from_url(f"/uploads/{ref_type.lower()}/{collection}/{decoded_filename}")
                logger.info(f"Alternative path: {alt_path} (absolute: {alt_path.resolve()})")
                logger.info(f"Alternative path exists: {alt_path.exists()}")
                if alt_path.exists():
                    file_path = alt_path

        if not file_path.exists():
            media_row = (
                db.query(Media)
                .filter(
                    func.lower(Media.model_type) == ref_type.lower(),
                    Media.collection == collection,
                    Media.name == decoded_filename,
                )
                .first()
            )
            if not media_row and decoded_filename != filename:
                media_row = (
                    db.query(Media)
                    .filter(
                        func.lower(Media.model_type) == ref_type.lower(),
                        Media.collection == collection,
                        Media.name == filename,
                    )
                    .first()
                )
            if (
                media_row
                and getattr(media_row, "storage", None) == "s3"
                and media_row.bucket
                and media_row.object_key
                and settings.S3_ENABLED
            ):
                try:
                    stream, s3_ct, _ = get_object_stream(
                        bucket=media_row.bucket, key=media_row.object_key
                    )
                except Exception as e:
                    logger.error("S3 get_object failed: %s", e, exc_info=True)
                    raise NotFoundException(f"File not found: {filename}") from e
                mime_type = s3_ct or media_row.mime_type or "application/octet-stream"
                fname = media_row.file_name or decoded_filename

                def body_iter():
                    try:
                        yield from iter_chunks(stream)
                    finally:
                        try:
                            stream.close()
                        except Exception:
                            pass

                return StreamingResponse(
                    body_iter(),
                    media_type=mime_type,
                    headers={
                        "Cache-Control": "private, max-age=86400",
                        "Content-Disposition": f'inline; filename="{fname}"',
                    },
                )

            logger.warning(f"File not found: {file_path}")
            logger.warning(f"File path absolute: {file_path.resolve()}")
            dir_path = upload_base / ref_type.lower() / collection
            if dir_path.exists():
                files = list(dir_path.iterdir())
                logger.warning(f"Files in directory {dir_path}: {[f.name for f in files]}")
            raise NotFoundException(f"File not found: {filename}")

        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            ext = file_path.suffix.lower()
            mime_type_map = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".gif": "image/gif",
                ".webp": "image/webp",
                ".svg": "image/svg+xml",
            }
            mime_type = mime_type_map.get(ext, "application/octet-stream")

        logger.info(f"Serving file: {file_path} with MIME type: {mime_type}")

        return FileResponse(
            path=str(file_path),
            media_type=mime_type,
            headers={
                "Cache-Control": "public, max-age=31536000",
                "Content-Disposition": f'inline; filename="{filename}"',
            },
        )
    except NotFoundException:
        raise
    except Exception as e:
        logger.error(f"Error serving file: {e}", exc_info=True)
        raise NotFoundException(f"Error serving file: {str(e)}") from e


# IMPORTANT: This endpoint must be defined BEFORE /{media_id} to avoid route conflicts
@public_router.get("/serve/{model_type}/{collection}/{filename:path}")
async def serve_media_file(
    request: Request,
    db: Session = Depends(get_db),
    ref_type: str = FastApiPath(..., alias="model_type"),
    collection: str = FastApiPath(...),
    filename: str = FastApiPath(...),
):
    """
    Serve media file (public) for img tags and static branding assets.
    """
    return await resolve_uploads_response(request, db, ref_type, collection, filename)


# IMPORTANT: Endpoint with query parameters must be defined BEFORE path parameters
@router.get("/", response_model=WebResponse[list[MediaRead]])
def get_media_by_model(
    ref_type: str = Query(..., alias="model_type", description="Model type (e.g., 'Student', 'User')"),
    ref_id: str = Query(..., alias="model_id", description="Model ID"),
    collection: Optional[str] = Query(None, description="Collection name (e.g., 'profile-pictures')"),
    db: Session = Depends(get_db),
):
    """
    Get media by model_type and model_id.
    Returns a list of media records matching the criteria.
    """
    try:
        logger.info(f"Get media request: model_type={ref_type}, model_id={ref_id}, collection={collection}")
        
        query = db.query(Media).filter(
            Media.model_type == ref_type,
            Media.model_id == ref_id
        )
        
        if collection:
            query = query.filter(Media.collection == collection)
        
        media_list = query.all()
        
        logger.info(f"Found {len(media_list)} media records")
        
        return WebResponse(
            status="success",
            data=[MediaRead.model_validate(m) for m in media_list]
        )
    except Exception as e:
        logger.error(f"Error getting media: {e}", exc_info=True)
        raise BadRequestException(f"Error getting media: {str(e)}")


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_media(
    file: UploadFile = File(...),
    ref_type: str = Form(..., alias="model_type"),
    ref_id: str = Form(..., alias="model_id"),
    collection: str = Form("default"),
    db: Session = Depends(get_db),
):
    """
    Upload a media file.
    """
    try:
        logger.info(f"Upload request received: model_type={ref_type}, model_id={ref_id}, collection={collection}, filename={file.filename}, content_type={file.content_type}")
        
        # Validate required fields
        if not ref_type or not ref_id:
            raise BadRequestException("model_type and model_id are required")
        
        # Validate file type
        if not file.content_type:
            logger.warning(f"No content_type provided for file: {file.filename}")
            raise BadRequestException("File content type is required")
        
        if not _is_allowed_upload(file.content_type, ref_type, collection):
            logger.warning(
                f"Invalid file type: {file.content_type} for file: {file.filename} "
                f"(model_type={ref_type}, collection={collection})"
            )
            if (ref_type or "").strip().lower() == "document":
                raise BadRequestException(
                    "Only PDF, DOC, DOCX, or image files are allowed for documents. "
                    f"Received: {file.content_type}"
                )
            raise BadRequestException(f"Only image files are allowed. Received: {file.content_type}")
        
        # Validate file size
        file_content = await file.read()
        file_size = len(file_content)
        
        # Ensure MAX_UPLOAD_SIZE is reasonable (minimum 1MB for images)
        max_upload_size = settings.MAX_UPLOAD_SIZE
        if max_upload_size < 1048576:  # Less than 1MB
            logger.warning(f"MAX_UPLOAD_SIZE is too small ({max_upload_size} bytes). Using minimum 5MB for images.")
            max_upload_size = 5242880  # 5MB minimum for images
        
        logger.info(f"File size: {file_size} bytes (max: {max_upload_size} bytes = {max_upload_size / 1024 / 1024:.2f}MB)")
        
        if file_size == 0:
            logger.warning(f"Empty file uploaded: {file.filename}")
            raise BadRequestException("File is empty")
        
        if file_size > max_upload_size:
            logger.warning(f"File size exceeds limit: {file_size} > {max_upload_size}")
            raise BadRequestException(f"File size exceeds maximum allowed size of {max_upload_size / 1024 / 1024:.2f}MB. File size: {file_size / 1024 / 1024:.2f}MB")
    except BadRequestException:
        raise
    except Exception as e:
        logger.error(f"Error validating upload: {e}", exc_info=True)
        raise BadRequestException(f"Error validating file: {str(e)}")
    
    # Generate unique filename
    try:
        file_ext = Path(file.filename).suffix if file.filename else ".jpg"
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        logger.info(f"Generated unique filename: {unique_filename}")
    except Exception as e:
        logger.error(f"Error generating filename: {e}", exc_info=True)
        raise BadRequestException(f"Error generating filename: {str(e)}")

    checksum_sha256 = hashlib.sha256(file_content).hexdigest()
    relative_url = f"/uploads/{ref_type.lower()}/{collection}/{unique_filename}"
    use_s3 = settings.S3_ENABLED and bool(settings.S3_ACCESS_KEY_ID and settings.S3_SECRET_ACCESS_KEY)
    bucket = settings.S3_BUCKET
    object_key = build_object_key(ref_type, collection, unique_filename)
    file_path: Path | None = None

    if use_s3:
        try:
            put_object_bytes(
                bucket=bucket,
                key=object_key,
                body=file_content,
                content_type=file.content_type or "application/octet-stream",
                extra_metadata={"model_id": ref_id, "model_type": ref_type},
            )
            logger.info("Uploaded to S3 bucket=%s key=%s", bucket, object_key)
        except Exception as e:
            logger.error("S3 upload failed: %s", e, exc_info=True)
            raise BadRequestException(f"Object storage upload failed: {e}") from e
    else:
        try:
            upload_dir = ensure_upload_dir(ref_type, collection)
            file_path = upload_dir / unique_filename
            with open(file_path, "wb") as f:
                f.write(file_content)
            if not file_path.exists() or file_path.stat().st_size != file_size:
                raise RuntimeError("Local file save verification failed")
            logger.info("File saved locally: %s", file_path.resolve())
        except Exception as e:
            logger.error("Error saving file locally: %s", e)
            if file_path and file_path.exists():
                try:
                    file_path.unlink()
                except Exception:
                    pass
            raise BadRequestException(f"Failed to save file: {e}") from e

    storage_val = "s3" if use_s3 else "local"

    existing_media = (
        db.query(Media)
        .filter(
            Media.model_type == ref_type,
            Media.model_id == ref_id,
            Media.collection == collection,
        )
        .first()
    )

    if existing_media:
        try:
            _remove_stored_bytes(existing_media)
        except Exception as e:
            logger.warning("Cleanup previous media bytes: %s", e)

        try:
            existing_media.url = relative_url
            existing_media.file_name = file.filename or unique_filename
            existing_media.name = unique_filename
            existing_media.mime_type = file.content_type or "application/octet-stream"
            existing_media.size = file_size
            existing_media.storage = storage_val
            existing_media.checksum_sha256 = checksum_sha256
            existing_media.bucket = bucket if use_s3 else None
            existing_media.object_key = object_key if use_s3 else None

            db.commit()
            db.refresh(existing_media)

            logger.info("Media record updated: id=%s url=%s storage=%s", existing_media.id, relative_url, storage_val)
        except Exception as e:
            db.rollback()
            logger.error("Error updating media record: %s", e)
            if use_s3:
                try:
                    delete_object(bucket=bucket, key=object_key)
                except Exception:
                    pass
            elif file_path and file_path.exists():
                try:
                    file_path.unlink()
                except Exception:
                    pass
            raise BadRequestException(f"Failed to update media record: {e}") from e

        return WebResponse(
            status="success",
            message="Media updated successfully",
            data=MediaRead.model_validate(existing_media),
        )

    try:
        media = Media(
            model_type=ref_type,
            model_id=ref_id,
            collection=collection,
            url=relative_url,
            file_name=file.filename or unique_filename,
            name=unique_filename,
            mime_type=file.content_type or "application/octet-stream",
            size=file_size,
            storage=storage_val,
            bucket=bucket if use_s3 else None,
            object_key=object_key if use_s3 else None,
            checksum_sha256=checksum_sha256,
        )
        db.add(media)
        db.commit()
        db.refresh(media)
        logger.info("Media record created: id=%s storage=%s", media.id, storage_val)
    except Exception as e:
        db.rollback()
        logger.error("Error creating media record: %s", e)
        if use_s3:
            try:
                delete_object(bucket=bucket, key=object_key)
            except Exception:
                pass
        elif file_path and file_path.exists():
            try:
                file_path.unlink()
            except Exception:
                pass
        raise BadRequestException(f"Failed to create media record: {e}") from e

    return WebResponse(
        status="success",
        message="Media uploaded successfully",
        data=MediaRead.model_validate(media),
    )


@router.get("/{media_id}", response_model=WebResponse[MediaRead])
def get_media_by_id(
    media_id: int,
    db: Session = Depends(get_db),
):
    """
    Get media by ID.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise NotFoundException(f"Media with ID {media_id} not found")
    
    return WebResponse(
        status="success",
        data=MediaRead.model_validate(media)
    )


@router.delete("/{media_id}", response_model=WebResponse[dict])
def delete_media(
    media_id: int,
    db: Session = Depends(get_db),
):
    """
    Delete media by ID.
    """
    media = db.query(Media).filter(Media.id == media_id).first()
    
    if not media:
        raise NotFoundException(f"Media with ID {media_id} not found")
    
    try:
        _remove_stored_bytes(media)
    except Exception as e:
        logger.error("Error removing stored bytes for media %s: %s", media_id, e)

    # Delete media record
    db.delete(media)
    db.commit()
    
    return WebResponse(
        status="success",
        message="Media deleted successfully"
    )

