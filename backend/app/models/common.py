from sqlalchemy import Column, String, Integer, BigInteger, DateTime, JSON, Index, func
from app.db.base_class import Base

class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_type = Column(String(255), nullable=False) # "User", "PurchasingGo", dll
    model_id = Column(String(36), nullable=False)
    collection = Column(String(255), default="default")
    url = Column(String(512), nullable=False)
    file_name = Column(String(255), nullable=False) # Original filename from user
    name = Column(String(255), nullable=False) # Unique filename stored on server
    mime_type = Column(String(255), nullable=False)
    size = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    # Object storage (local disk vs s3/minio)
    storage = Column(String(16), nullable=False, default="local")  # local | s3
    bucket = Column(String(255), nullable=True)
    object_key = Column(String(1024), nullable=True)
    checksum_sha256 = Column(String(64), nullable=True)

    __table_args__ = (Index("idx_media_model", "model_type", "model_id"),)

class Setting(Base):
    __tablename__ = "settings"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    group = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    locked = Column(Integer, default=0) # TinyInt di MySQL = Integer di SQLAlchemy
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

