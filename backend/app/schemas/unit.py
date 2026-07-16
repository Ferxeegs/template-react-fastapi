from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

class UnitBase(BaseModel):
    name: str
    parent_id: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[str] = None

class UnitRead(UnitBase):
    id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class UnitDetailRead(UnitRead):
    parent: Optional[UnitRead] = None
    children: List[UnitRead] = []

UnitDetailRead.model_rebuild()
