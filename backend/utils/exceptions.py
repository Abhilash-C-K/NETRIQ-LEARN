class NetriqException(Exception):
    """Base exception for all NETRIQ custom errors."""
    pass

# --- Auth & Security ---
class InvalidCredentialsError(NetriqException): pass
class AccountLockedError(NetriqException): pass
class TokenExpiredError(NetriqException): pass
class InvalidTokenError(NetriqException): pass
class WeakPasswordError(NetriqException): pass
class InsufficientPermissionError(NetriqException): pass

# --- Database ---
class DatabaseConnectionError(NetriqException): pass
class DocumentNotFoundError(NetriqException): pass

# --- Response & Network ---
class FirewallUnreachableError(NetriqException): pass
class QuarantineFailedError(NetriqException): pass

# --- API & Validation ---
class ValidationError(NetriqException): pass
class RateLimitExceededError(NetriqException): pass
