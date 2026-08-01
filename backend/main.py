import uvicorn
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.exceptions import RequestValidationError
from backend.utils.exceptions import NetriqException
from backend.utils.logger import get_logger

# Import Middlewares
from backend.middleware.logging import LoggingMiddleware
from backend.middleware.cors import add_cors_middleware
from backend.middleware.security import SecurityHeadersMiddleware
from backend.middleware.auth import AuthMiddleware
from backend.middleware.rate_limit import RateLimitMiddleware

# Import Routers
from backend.api.auth import router as auth_router
from backend.api.dashboard import router as dashboard_router
from backend.api.analytics import router as analytics_router
from backend.api.monitoring import router as monitoring_router
from backend.api.prediction import router as prediction_router
from backend.api.incidents import router as incidents_router
from backend.api.history import router as history_router
from backend.api.reports import router as reports_router
from backend.api.response import router as response_router
from backend.api.users import router as users_router
from backend.api.settings import router as settings_router
from backend.api.health import router as health_router
from backend.api.websocket import router as websocket_router

logger = get_logger(__name__)

app = FastAPI(title="NETRIQ API", version="1.0.0")

# --- Middlewares ---
# Order matters: Executed from bottom to top of declaration, except CORSMiddleware
# Logging is first to catch everything
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthMiddleware)
app.add_middleware(SecurityHeadersMiddleware)
add_cors_middleware(app)
app.add_middleware(LoggingMiddleware)

# --- Exception Handlers ---
@app.exception_handler(NetriqException)
async def netriq_exception_handler(request: Request, exc: NetriqException):
    logger.error(f"Domain Error: {exc.__class__.__name__}: {str(exc)}")
    # Default to 400 for domain errors, specific ones can be mapped differently
    status_code = 400
    if exc.__class__.__name__ in ["InvalidCredentialsError", "TokenExpiredError", "InvalidTokenError"]:
        status_code = 401
    elif exc.__class__.__name__ in ["AccountLockedError", "InsufficientPermissionError"]:
        status_code = 403
    return JSONResponse(
        status_code=status_code,
        content={"error": exc.__class__.__name__, "message": str(exc), "detail": {}}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Server Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"error": "InternalServerError", "message": "An unexpected error occurred.", "detail": {}}
    )

# --- Routers ---
@app.get("/", include_in_schema=False)
async def root():
    return RedirectResponse(url="/docs")

app.include_router(auth_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(analytics_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api/v1")
app.include_router(prediction_router, prefix="/api/v1")
app.include_router(incidents_router, prefix="/api/v1")
app.include_router(history_router, prefix="/api/v1")
app.include_router(reports_router, prefix="/api/v1")
app.include_router(response_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(health_router, prefix="/api/v1")
app.include_router(websocket_router) # WebSockets typically sit at root /ws

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
