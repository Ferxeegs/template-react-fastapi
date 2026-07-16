import uuid
from sqlalchemy import Column, String, CHAR
from sqlalchemy.sql import func
from app.db.base_class import Base
from app.db.types import UTCDateTime

class TimestampMixin:
    created_at = Column(UTCDateTime, server_default=func.now())
    updated_at = Column(UTCDateTime, onupdate=func.now())

class AuditMixin:
    created_by = Column(String(36), nullable=True)
    updated_by = Column(String(36), nullable=True)
    deleted_by = Column(String(36), nullable=True)
    deleted_at = Column(UTCDateTime, nullable=True)