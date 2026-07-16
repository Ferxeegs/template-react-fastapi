from pydantic import BaseModel, ConfigDict
from typing import Any, Optional, Generic, TypeVar
from datetime import datetime

T = TypeVar("T")

class WebResponse(BaseModel, Generic[T]):
    status: str = "success"
    message: Optional[str] = None
    data: Optional[T] = None

class MediaRead(BaseModel):
    id: int
    url: str
    collection: str
    file_name: str  # Original filename from user
    name: str  # Unique filename stored on server
    mime_type: str
    size: int
    created_at: Optional[datetime] = None
    storage: str = "local"
    bucket: Optional[str] = None
    object_key: Optional[str] = None
    checksum_sha256: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    page: int = 1
    limit: int = 10
    search: Optional[str] = None

    class Config:
        from_attributes = True


class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    limit: int
    total_pages: int

    @classmethod
    def create(cls, items: list[T], total: int, page: int, limit: int):
        total_pages = (total + limit - 1) // limit if limit > 0 else 0
        return cls(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
