from pydantic import BaseModel, model_validator
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    expires_in: int


class SessionConfig(BaseModel):
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    idle_timeout_minutes: int
    session_warning_seconds: int
    session_refresh_buffer_seconds: int


class SessionStatus(BaseModel):
    expires_in: int
    expires_at: int | None = None

class TokenData(BaseModel):
    username: Optional[str] = None

class LoginRequest(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str
    remember_me: bool = False
    turnstile_token: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_identifier(self):
        """Validate that either email or username is provided"""
        # Convert empty strings to None
        if self.email == "":
            self.email = None
        if self.username == "":
            self.username = None
        
        # Check that at least one is provided
        if not self.email and not self.username:
            raise ValueError("Either email or username must be provided")
        
        return self