"""
Application configuration settings.
All environment variables should be defined in .env file.
"""
from typing import List
from urllib.parse import quote_plus

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Project Information
    PROJECT_NAME: str = "App Template"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    DEBUG: bool = Field(default=False, description="Debug mode")
    
    # Database (MySQL eksternal di jaringan app-bridge, atau PostgreSQL)
    DB_HOST: str = Field(
        default="mysql-container",
        description="Database host (nama container di app-bridge, atau localhost dari host)",
    )
    DB_PORT: int = Field(default=3306, description="Database port")
    DB_NAME: str = Field(default="db_app", description="Database name")
    DB_USER: str = Field(default="root", description="Database user")
    DB_PASSWORD: str = Field(default="", description="Database password")
    DATABASE_URL: str = Field(default="", description="SQLAlchemy database URL (opsional jika DB_* diisi)")

    @model_validator(mode="after")
    def build_database_url(self) -> "Settings":
        if self.DATABASE_URL:
            return self
        user = quote_plus(self.DB_USER)
        password = quote_plus(self.DB_PASSWORD)
        self.DATABASE_URL = (
            f"mysql+pymysql://{user}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"
            "?charset=utf8mb4"
        )
        return self
    
    # Security
    SECRET_KEY: str = Field(..., description="Secret key for JWT tokens")
    ALGORITHM: str = Field(default="HS256", description="JWT algorithm")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30, description="Access token expiration in minutes")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7, description="Refresh token expiration in days")
    SESSION_IDLE_TIMEOUT_MINUTES: int = Field(
        default=0,
        description="Idle logout threshold in minutes; 0 = same as ACCESS_TOKEN_EXPIRE_MINUTES",
    )
    SESSION_WARNING_SECONDS: int = Field(
        default=60,
        description="Show session warning modal this many seconds before idle logout or token expiry",
    )
    SESSION_REFRESH_BUFFER_SECONDS: int = Field(
        default=60,
        description="Proactively refresh access token this many seconds before it expires",
    )
    COOKIE_SECURE: bool = Field(
        default=False,
        description="Set Secure flag on auth cookies (True when served over HTTPS)",
    )
    ALLOW_PUBLIC_REGISTER: bool = Field(
        default=False,
        description="Allow POST /auth/register without authentication",
    )
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:8000"],
        description="Allowed CORS origins"
    )
    
    # Server
    HOST: str = Field(default="0.0.0.0", description="Server host")
    PORT: int = Field(default=8000, description="Server port")
    
    # Logging
    LOG_LEVEL: str = Field(default="INFO", description="Logging level")

    # Redis / Cache / Rate Limiting
    REDIS_URL: str = Field(default="redis://localhost:6379/0", description="Redis connection URL")
    REDIS_ENABLED: bool = Field(default=True, description="Enable Redis-backed features")
    REDIS_FAIL_OPEN: bool = Field(
        default=True,
        description="If Redis is unavailable, continue requests without cache/rate-limit enforcement",
    )
    CACHE_DEFAULT_TTL_SECONDS: int = Field(default=300, description="Default cache TTL in seconds")
    RATE_LIMIT_LOGIN_MAX_ATTEMPTS: int = Field(default=5, description="Max login attempts in window")
    RATE_LIMIT_LOGIN_WINDOW_SECONDS: int = Field(default=60, description="Rate limit window in seconds")
    
    # Email (optional, for password reset)
    SMTP_TLS: bool = Field(default=True)
    SMTP_PORT: int = Field(default=587)
    SMTP_HOST: str = Field(default="")
    SMTP_USER: str = Field(default="")
    SMTP_PASSWORD: str = Field(default="")
    EMAILS_FROM_EMAIL: str = Field(default="")
    EMAILS_FROM_NAME: str = Field(default="")
    
    # File Upload
    MAX_UPLOAD_SIZE: int = Field(default=10485760, description="Max upload size in bytes (10MB)")
    UPLOAD_DIR: str = Field(default="uploads", description="Upload directory")

    # MinIO / S3-compatible object storage (optional; when disabled, files use UPLOAD_DIR)
    S3_ENABLED: bool = Field(default=False, description="Store uploads in S3/MinIO instead of local disk")
    S3_ENDPOINT_URL: str = Field(
        default="http://minio:9000",
        description="S3 API endpoint (inside Docker: http://minio:9000)",
    )
    S3_ACCESS_KEY_ID: str = Field(default="", description="S3 access key (e.g. MINIO_ROOT_USER)")
    S3_SECRET_ACCESS_KEY: str = Field(default="", description="S3 secret key")
    S3_BUCKET: str = Field(
        default="app-documents",
        description="Default private bucket for application uploads",
        validation_alias=AliasChoices("S3_BUCKET", "MINIO_DEFAULT_BUCKET"),
    )
    S3_PUBLIC_BUCKET: str = Field(
        default="app-public-documents",
        description="Bucket for publicly readable assets",
        validation_alias=AliasChoices("S3_PUBLIC_BUCKET", "MINIO_PUBLIC_BUCKET"),
    )
    S3_PUBLIC_BROWSER_BASE_URL: str = Field(
        default="",
        description=(
            "Browser-reachable base for path-style URLs, no trailing slash "
            "(e.g. http://localhost:9000). Used with {base}/{bucket}/{key} for public PDF links."
        ),
    )
    S3_REGION: str = Field(
        default="us-east-1",
        description="Region string required by S3 SDK (MinIO uses a label)",
        validation_alias=AliasChoices("S3_REGION", "MINIO_SITE_REGION"),
    )
    S3_USE_SSL: bool = Field(default=False, description="Use https for S3 endpoint")
    S3_ADDRESSING_STYLE: str = Field(
        default="path",
        description="S3 addressing style: path (MinIO) or virtual",
    )

    # Cloudflare Turnstile (optional). When set, login requires a valid widget token.
    # https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
    TURNSTILE_SECRET_KEY: str = Field(
        default="",
        description="Turnstile secret key; empty disables enforcement (e.g. local dev)",
    )

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


settings = Settings()