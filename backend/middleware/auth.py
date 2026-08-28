from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from backend.auth.jwt_handler import verify_token
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError

class AuthMiddleware(BaseHTTPMiddleware):
    """
    HTTP Interceptor for JWT authentication.
    - No Authorization header → request.state.user = None (anonymous; protected routes
      reject it via the permissions dependency).
    - Valid Bearer token → request.state.user = decoded payload.
    - Malformed / expired / tampered token → immediate HTTP 401 with WWW-Authenticate
      header (RFC 6750 §3.1) so the client knows to re-authenticate, not retry.
    Contains NO business logic.
    """
    # Paths that must never be blocked even without a token
    _PUBLIC_PREFIXES = ("/api/v1/auth/login", "/api/v1/auth/refresh", "/docs", "/openapi", "/redoc")

    async def dispatch(self, request: Request, call_next):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            # Anonymous request — let protected routes enforce auth via dependencies
            request.state.user = None
            return await call_next(request)

        if not auth_header.startswith("Bearer "):
            # Malformed Authorization header
            return JSONResponse(
                status_code=401,
                headers={"WWW-Authenticate": "Bearer error=\"invalid_request\""},
                content={"error": "InvalidTokenError", "message": "Authorization header must use Bearer scheme."}
            )

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return JSONResponse(
                status_code=401,
                headers={"WWW-Authenticate": "Bearer error=\"invalid_request\""},
                content={"error": "InvalidTokenError", "message": "Bearer token is empty."}
            )

        try:
            payload = verify_token(token, expected_type="access")
            request.state.user = payload
        except TokenExpiredError:
            return JSONResponse(
                status_code=401,
                headers={"WWW-Authenticate": "Bearer error=\"invalid_token\", error_description=\"Token has expired\""},
                content={"error": "TokenExpiredError", "message": "Access token has expired. Please refresh your token."}
            )
        except InvalidTokenError as e:
            return JSONResponse(
                status_code=401,
                headers={"WWW-Authenticate": "Bearer error=\"invalid_token\""},
                content={"error": "InvalidTokenError", "message": str(e)}
            )

        return await call_next(request)
