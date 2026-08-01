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

# --- AI & ML ---
class PredictionError(NetriqException): pass
class ModelLoadError(NetriqException): pass
class FeatureEncodingError(NetriqException): pass

# --- Response & Sandbox ---
class SandboxRoutingError(NetriqException): pass
class FirewallApiError(NetriqException): pass

# --- Database & Backup ---
class FatalRestoreError(NetriqException): pass
class DuplicateKeyError(NetriqException): pass

