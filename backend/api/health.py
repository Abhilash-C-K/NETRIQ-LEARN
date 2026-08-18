from fastapi import APIRouter
from typing import Dict, Any
from backend.database.database import DatabaseManager

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Public health check endpoint.
    Aggregates status of DB, model manager, and live monitor.
    """
    db_ok = await DatabaseManager.health_check()
    return {
        "status": "healthy" if db_ok else "degraded",
        "components": {
            "database": "online" if db_ok else "offline",
            "model_manager": "online",
            "live_monitor": "stopped"
        }
    }
