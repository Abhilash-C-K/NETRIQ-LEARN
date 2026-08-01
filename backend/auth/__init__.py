from backend.auth.exceptions import (
    InvalidCredentialsError,
    TokenExpiredError,
    InvalidTokenError,
    InsufficientPermissionError,
    AccountLockedError,
    WeakPasswordError
)
from backend.auth.jwt_handler import (
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_token
)
from backend.auth.password import (
    hash_password,
    verify_password,
    validate_password_policy
)
from backend.auth.roles import Role, Capabilities, PERMISSION_MATRIX
from backend.auth.permissions import require_permission
from backend.auth.auth_service import AuthService

__all__ = [
    "InvalidCredentialsError",
    "TokenExpiredError",
    "InvalidTokenError",
    "InsufficientPermissionError",
    "AccountLockedError",
    "WeakPasswordError",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "verify_token",
    "hash_password",
    "verify_password",
    "validate_password_policy",
    "Role",
    "Capabilities",
    "PERMISSION_MATRIX",
    "require_permission",
    "AuthService"
]
