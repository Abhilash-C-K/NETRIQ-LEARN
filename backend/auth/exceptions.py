from backend.utils.exceptions import NetriqException

class InvalidCredentialsError(NetriqException): pass
class TokenExpiredError(NetriqException): pass
class InvalidTokenError(NetriqException): pass
class InsufficientPermissionError(NetriqException): pass
class AccountLockedError(NetriqException): pass
class WeakPasswordError(NetriqException): pass
