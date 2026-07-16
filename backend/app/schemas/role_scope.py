from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import datetime

class ScopeRead(BaseModel):
    id: str
    name: str

    model_config = ConfigDict(from_attributes=True)

class UserRoleScopeRead(BaseModel):
    user_role_id: int
    role_id: int
    role_name: str
    created_at: Optional[datetime] = None
    scopes: List[ScopeRead]

    model_config = ConfigDict(from_attributes=True)

class RoleScopeUpdate(BaseModel):
    scope_ids: List[str]
