from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from pathlib import Path

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import root_logger
from app.core.exceptions import AppException
from app.core.redis_client import safe_ping_redis, close_redis_client
from app.api.v1 import api_router
from app.api.deps import get_db
from app.api.v1.endpoints.media import resolve_uploads_response
from app.middleware.logging_middleware import LoggingMiddleware
from app.core.scheduler import shutdown_scheduler, start_scheduler

logger = root_logger

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info(f"Starting {settings.PROJECT_NAME} v{settings.PROJECT_VERSION}")
    if settings.REDIS_ENABLED:
        if safe_ping_redis():
            logger.info("Redis connected successfully")
        else:
            logger.warning("Redis is enabled but unavailable; running in degraded mode")
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()
    close_redis_client()
    logger.info(f"Shutting down {settings.PROJECT_NAME}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    redirect_slashes=False # Penting untuk cegah redirect 307
)

# --- FIX HTTPS CLOUDFLARE ---
# Karena ProxyHeaders sudah ada di Dockerfile CMD, 
# kita cukup tambahkan middleware skema saja di sini.
@app.middleware("http")
async def set_https_scheme(request: Request, call_next):
    # Paksa FastAPI menganggap dirinya HTTPS jika header dari Cloudflare ada
    if request.headers.get("x-forwarded-proto") == "https":
        request.scope["scheme"] = "https"
    return await call_next(request)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Public-Asset-Url"],
)

app.add_middleware(LoggingMiddleware)

# Exception handlers tetap sama...
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(status_code=exc.status_code, content={"message": exc.detail})

app.include_router(api_router, prefix=settings.API_V1_STR)

# Writable upload root (local mode); S3-backed media is served via the same URL below.
upload_dir = Path(settings.UPLOAD_DIR)
upload_dir.mkdir(parents=True, exist_ok=True)


@app.get("/uploads/{model_type}/{collection}/{filename:path}")
async def serve_uploads_public(
    request: Request,
    model_type: str,
    collection: str,
    filename: str,
    db: Session = Depends(get_db),
):
    """Same paths as before: disk when present, else stream from object storage using `media` metadata."""
    return await resolve_uploads_response(request, db, model_type, collection, filename)

@app.get("/")
def health_check():
    return {"status": "healthy"}