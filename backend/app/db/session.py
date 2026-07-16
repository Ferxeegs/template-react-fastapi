"""
Database session configuration.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

_connect_args: dict = {}
if settings.DATABASE_URL.startswith("mysql"):
    _connect_args["charset"] = "utf8mb4"

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    pool_pre_ping=True,  # Verify connections before using
    pool_size=10,
    max_overflow=20
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)