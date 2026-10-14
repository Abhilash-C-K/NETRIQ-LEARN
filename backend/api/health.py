from fastapi import APIRouter
from typing import Dict, Any
from backend.database.database import DatabaseManager
from backend.services.monitoring_service import monitoring_service
from backend.ai.model_manager import ModelManager

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Public health check endpoint.
    Aggregates status of DB, model manager, and live monitor dynamically.
    """
    db_ok = await DatabaseManager.health_check()
    mon_status = monitoring_service.get_status()
    monitor_online = mon_status.get("is_running", False)
    
    mm = ModelManager()
    models_ready = bool(mm._models)

    overall = "healthy" if (db_ok and models_ready) else "degraded"

    return {
        "status": overall,
        "components": {
            "database": "online" if db_ok else "offline",
            "model_manager": "online" if models_ready else "initializing",
            "live_monitor": "running" if monitor_online else "stopped"
        }
    }

