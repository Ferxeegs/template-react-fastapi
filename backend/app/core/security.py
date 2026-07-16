"""
Security utilities for authentication and authorization.
"""
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
import bcrypt
from fastapi import HTTPException, status
from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Bcrypt hashed password
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        # Convert string to bytes if needed
        if isinstance(plain_password, str):
            plain_password = plain_password.encode('utf-8')
        if isinstance(hashed_password, str):
            hashed_password = hashed_password.encode('utf-8')
        
        return bcrypt.checkpw(plain_password, hashed_password)
    except (ValueError, TypeError) as e:
        return False


def get_password_hash(password: str) -> str:
    """
    Hash a password safely using bcrypt.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string (UTF-8 decoded)
        
    Raises:
        ValueError: If password is already hashed or exceeds 72 bytes
    """
    if not password:
        raise ValueError("Password cannot be empty")
    
    # Gunakan .strip() untuk membuang spasi/newline yang tidak sengaja terbawa
    clean_password = password.strip()
    
    # Cek apakah password sudah berupa hash (bcrypt hash biasanya dimulai dengan $2)
    # Bcrypt hash memiliki format: $2a$, $2b$, atau $2y$ diikuti dengan panjang tertentu
    if clean_password.startswith("$2") and len(clean_password) >= 59:
        # Password sudah di-hash, jangan hash lagi
        raise ValueError(
            "Password appears to be already hashed. "
            "Please provide plain text password, not a hash."
        )
    
    # Bcrypt memiliki limit 72 bytes untuk plain text password
    # Kita pastikan tidak melewatinya sebelum hashing
    password_bytes = clean_password.encode('utf-8')
    if len(password_bytes) > 72:
        raise ValueError(
            f"Password cannot exceed 72 bytes. "
            f"Current length: {len(password_bytes)} bytes"
        )
    
    # Generate salt and hash password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # Return as UTF-8 string
    return hashed.decode('utf-8')


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and verify a JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a long-lived JWT used only to obtain new access tokens (HttpOnly cookie)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_use": "refresh",
        }
    )
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_refresh_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode refresh JWT; rejects access tokens and invalid signatures."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("token_use") != "refresh":
            return None
        return payload
    except JWTError:
        return None

