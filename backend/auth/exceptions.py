"""
Custom exceptions for the NetrIQ Auth module.
"""

class InvalidCredentialsError(Exception):
    """Raised when email or password is incorrect."""
    pass

class TokenExpiredError(Exception):
    """Raised when a JWT token has expired."""
    pass

class InvalidTokenError(Exception):
    """Raised when a JWT token is malformed, tampered with, or invalid."""
    pass

class InsufficientPermissionError(Exception):
    """Raised when a user attempts to access a resource they do not have a role for."""
    pass

class AccountLockedError(Exception):
    """Raised when a user is locked out due to too many failed login attempts."""
    pass

class WeakPasswordError(Exception):
    """Raised when a password fails the complexity policy."""
    pass
