from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime
from .role import RoleRead


class UserBase(BaseModel):
    username: str
    email: EmailStr
    firstname: str
    lastname: str
    fullname: Optional[str] = None
    phone_number: Optional[str] = None

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        if len(v) < 3:
            raise ValueError('Username must be at least 3 characters')
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username can only contain letters, numbers, underscores, and dashes')
        return v


class UserCreate(UserBase):
    password: str
    role_ids: Optional[List[int]] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserUpdate(BaseModel):
    firstname: Optional[str] = None
    lastname: Optional[str] = None
    username: Optional[str] = None
    fullname: Optional[str] = None
    phone_number: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v


class UserRead(UserBase):
    id: str
    email_verified_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    deleted_at: Optional[datetime] = None
    roles: List[RoleRead] = []

    model_config = ConfigDict(from_attributes=True)


class UserRoleUpdate(BaseModel):
    role_ids: List[int]


class UserPasswordReset(BaseModel):
    password: str
    confirm_password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v: str, info) -> str:
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v


class UserPasswordChange(BaseModel):
    current_password: str
    password: str
    confirm_password: str

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        return v

    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v: str, info) -> str:
        if 'password' in info.data and v != info.data['password']:
            raise ValueError('Passwords do not match')
        return v