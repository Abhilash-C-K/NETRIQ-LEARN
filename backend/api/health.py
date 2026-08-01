from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Public health check endpoint.
    Aggregates status of DB, model manager, and live monitor.
    """
    # Stub: Normally calls ping() on DB and check_status() on managers
    return {
        "status": "healthy",
        "components": {
            "database": "online",
            "model_manager": "online",
            "live_monitor": "stopped"
        }
    }
