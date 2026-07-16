from pydantic import BaseModel, ConfigDict
from typing import Optional, Any, Dict
from datetime import datetime


class SettingRead(BaseModel):
    id: int
    group: str
    name: str
    locked: int
    payload: Optional[Any] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class SettingCreate(BaseModel):
    group: str
    name: str
    payload: Optional[Any] = None
    locked: Optional[bool] = False


class SettingUpdate(BaseModel):
    payload: Optional[Any] = None
    locked: Optional[bool] = None


class SettingUpsert(BaseModel):
    group: str
    name: str
    payload: Optional[Any] = None
    locked: Optional[bool] = False


class SettingMultipleUpdate(BaseModel):
    settings: list[SettingUpsert]

