from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from backend.auth.jwt_handler import verify_token
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError

class AuthMiddleware(BaseHTTPMiddleware):
    """
    HTTP Interceptor for JWT authentication.
    Extracts the token, decodes it, and attaches the payload to request.state.user.
    Contains NO business logic.
    """
    async def dispatch(self, request: Request, call_next):
        # We don't block here; we just try to attach the user if token exists.
        # The actual enforcement (HTTP 401/403) happens in the dependencies (permissions.py).
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            try:
                # This will raise exceptions if invalid/expired, which the global 
                # exception handler will catch and return 401.
                payload = verify_token(token, expected_type="access")
                request.state.user = payload
            except (TokenExpiredError, InvalidTokenError):
                request.state.user = None
        else:
            request.state.user = None
            
        return await call_next(request)
