from pydantic import BaseModel, ConfigDict, field_validator
from typing import List, Optional
from datetime import datetime


class PermissionRead(BaseModel):
    id: int
    name: str
    guard_name: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoleBase(BaseModel):
    name: str
    guard_name: str

    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        if not v or len(v.strip()) == 0:
            raise ValueError('Role name cannot be empty')
        return v.strip()


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    guard_name: Optional[str] = None


class RoleRead(RoleBase):
    id: int
    permissions: List[PermissionRead] = []
    permissions_count: int = 0
    users_count: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RoleDetailRead(RoleRead):
    users: List[dict] = []

    model_config = ConfigDict(from_attributes=True)


class RolePermissionUpdate(BaseModel):
    permission_ids: List[int]
