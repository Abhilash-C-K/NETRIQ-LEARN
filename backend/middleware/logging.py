import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Logs every incoming request and outgoing response status.
    Placed at the top of the stack to catch everything.
    """
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        
        # Log request
        logger.info(f"API Request: {request.method} {request.url.path} from {client_ip}")
        
        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            logger.info(f"API Response: {response.status_code} [{process_time:.4f}s]")
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"API Unhandled Exception: {str(e)} [{process_time:.4f}s]")
            raise
