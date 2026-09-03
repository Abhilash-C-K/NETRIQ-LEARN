import time
import asyncio
import os
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Simple in-memory fixed-window rate limiter.
    Falls back to failing OPEN (allowing traffic) if internal memory structures fail 
    to prevent accidental DoS of the platform.
    """
    def __init__(self, app, max_requests: int = 300, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", str(max_requests)))
        self.window_seconds = window_seconds
        self._cache = {}
        self._lock = asyncio.Lock()
        
        # Auth limits (default 30 requests per minute to prevent dev testing lockouts)
        self.auth_max = int(os.getenv("RATE_LIMIT_AUTH_MAX", "30"))
        self.auth_window = 60

    async def dispatch(self, request: Request, call_next):
        try:
            client_ip = request.client.host if request.client else "unknown"
            path = request.url.path
            
            # Determine if this is a strict auth route (actual prefix is /api/v1/auth/)
            is_auth = path.startswith("/api/v1/auth/")
            limit = self.auth_max if is_auth else self.max_requests
            window = self.auth_window if is_auth else self.window_seconds
            
            key = f"{client_ip}:{path}" if is_auth else client_ip
            now = time.time()
            
            async with self._lock:
                # Cleanup old entries to prevent memory leak
                if len(self._cache) > 10000:
                    expired_keys = [k for k, v in self._cache.items() if now > v["reset_time"]]
                    for k in expired_keys:
                        del self._cache[k]
                    if len(self._cache) > 10000:
                        self._cache.clear() # Fail-open fallback if still oversized
                
                record = self._cache.get(key, {"count": 0, "reset_time": now + window})
                
                if now > record["reset_time"]:
                    # Reset window
                    record = {"count": 1, "reset_time": now + window}
                else:
                    record["count"] += 1
                    if record["count"] > limit:
                        logger.warning(f"Rate limit exceeded for {client_ip} on {path} ({record['count']}/{limit})")
                        # HTTP 429 Too Many Requests
                        raise HTTPException(
                            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                            detail="Rate limit exceeded. Try again later."
                        )
                
                self._cache[key] = record
                
        except HTTPException:
            raise
        except Exception as e:
            # Fail OPEN
            logger.error(f"Rate limiter internal error, failing OPEN: {e}")
            
        return await call_next(request)
