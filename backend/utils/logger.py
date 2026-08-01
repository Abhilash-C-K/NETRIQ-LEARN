import logging
import json
import sys
from contextvars import ContextVar

# ContextVar for distributed request tracing
correlation_id: ContextVar[str] = ContextVar("correlation_id", default="-")

class JSONFormatter(logging.Formatter):
    """Structured JSON formatter for production logging."""
    def format(self, record):
        log_record = {
            "time": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "name": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id.get()
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def get_logger(name: str) -> logging.Logger:
    """
    Factory function for structured logging.
    Ensures consistency across all NETRIQ modules.
    """
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        logger.setLevel(logging.INFO) # Ideally configurable via os.getenv("LOG_LEVEL")
        
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JSONFormatter())
        logger.addHandler(handler)
        
    # Prevent duplicate logs from bubbling up to root
    logger.propagate = False
    return logger
