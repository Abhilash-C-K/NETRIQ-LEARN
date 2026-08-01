import os
import jwt
from datetime import datetime, timedelta
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError

logger = get_logger(__name__)

# Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "super_secret_key_change_in_prod")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))

def create_access_token(user_id: str, role: str) -> str:
    """Creates a short-lived access token with role and user_id claims."""
    expire = datetime.utcnow() + timedelta(minutes=JWT_ACCESS_EXPIRY_MINUTES)
    to_encode = {
        "sub": user_id,
        "role": role,
        "exp": expire,
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: str) -> str:
    """Creates a long-lived refresh token."""
    expire = datetime.utcnow() + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    to_encode = {
        "sub": user_id,
        "exp": expire,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """Decodes a JWT token without verifying its type, but verifies signature and expiry."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError as e:
        raise TokenExpiredError("Token has expired") from e
    except jwt.InvalidTokenError as e:
        raise InvalidTokenError("Token is invalid or tampered") from e

def verify_token(token: str, expected_type: str = "access") -> Dict[str, Any]:
    """
    Decodes and verifies that the token matches the expected type.
    Raises exceptions on expiry or invalidation.
    """
    payload = decode_token(token)
    if payload.get("type") != expected_type:
        logger.warning(f"Token type mismatch. Expected {expected_type}, got {payload.get('type')}")
        raise InvalidTokenError(f"Invalid token type. Expected {expected_type}")
    return payload
