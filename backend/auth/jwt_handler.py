import os
import secrets
import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError

logger = get_logger(__name__)

# Configuration (Ensure 32+ byte default key for HMAC-SHA256)
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "netriq_super_secret_jwt_key_32_bytes_min!!")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "7"))

# RFC 7519 issuer and audience claims for strict token scoping
JWT_ISSUER = os.getenv("JWT_ISSUER", "netriq-api")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "netriq-client")

def create_access_token(user_id: str, role: str) -> str:
    """
    Creates a short-lived access token.
    Claims: sub, role, iat, exp, nbf, jti, iss, aud, type.
    - jti (JWT ID): cryptographically random ID for future revocation support.
    - nbf (not-before): prevents token use before issuance.
    - iss/aud: issuer/audience for strict scope validation.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=JWT_ACCESS_EXPIRY_MINUTES)
    to_encode = {
        "sub": user_id,
        "role": role,
        "iat": now,
        "nbf": now,
        "exp": expire,
        "jti": secrets.token_hex(16),  # Unique token ID
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "type": "access"
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def create_refresh_token(user_id: str) -> str:
    """
    Creates a long-lived refresh token.
    Claims: sub, iat, exp, nbf, jti, iss, aud, type.
    - jti: unique ID stored as SHA-256 hash in DB for revocation.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(days=JWT_REFRESH_EXPIRY_DAYS)
    to_encode = {
        "sub": user_id,
        "iat": now,
        "nbf": now,
        "exp": expire,
        "jti": secrets.token_hex(16),
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "type": "refresh"
    }
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Dict[str, Any]:
    """
    Decodes a JWT token, verifying signature, expiry, nbf, iss, and aud claims.
    Does NOT verify the 'type' claim — use verify_token() for typed verification.
    """
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
            issuer=JWT_ISSUER,
            audience=JWT_AUDIENCE,
            options={"require": ["exp", "iat", "sub", "nbf", "jti"]}
        )
        return payload
    except jwt.ExpiredSignatureError as e:
        raise TokenExpiredError("Token has expired") from e
    except jwt.ImmatureSignatureError as e:
        raise InvalidTokenError("Token is not yet valid (nbf)") from e
    except jwt.InvalidIssuerError as e:
        raise InvalidTokenError("Token issuer mismatch") from e
    except jwt.InvalidAudienceError as e:
        raise InvalidTokenError("Token audience mismatch") from e
    except jwt.MissingRequiredClaimError as e:
        raise InvalidTokenError(f"Token missing required claim: {e}") from e
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
