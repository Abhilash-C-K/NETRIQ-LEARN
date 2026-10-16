import time
import platform
from fastapi import APIRouter
from typing import Dict, Any
from backend.database.database import DatabaseManager
from backend.services.monitoring_service import monitoring_service
from backend.ai.model_manager import ModelManager

try:
    import psutil
except ImportError:
    psutil = None

router = APIRouter(prefix="/health", tags=["health"])

@router.get("", response_model=Dict[str, Any])
async def health_check():
    """
    Public health check endpoint.
    Aggregates status of DB, model manager, live sniffer, and host OS hardware metrics.
    """
    db_ok = await DatabaseManager.health_check()
    mon_status = monitoring_service.get_status()
    monitor_online = mon_status.get("is_running", False)
    
    mm = ModelManager()
    models_ready = bool(mm._models)

    overall = "healthy" if (db_ok and models_ready) else "degraded"

    host_info = {
        "os": f"{platform.system()} {platform.release()}",
        "architecture": platform.machine(),
        "active_interface": mon_status.get("interface", "Default (Auto-select)"),
        "packets_captured": mon_status.get("packets_captured", 0),
        "flows_processed": mon_status.get("flows_processed", 0),
        "uptime_seconds": mon_status.get("uptime_seconds", 0.0),
    }

    if psutil:
        try:
            vm = psutil.virtual_memory()
            net_io = psutil.net_io_counters()
            host_info.update({
                "cpu_percent": round(psutil.cpu_percent(interval=None), 1),
                "cpu_count": psutil.cpu_count(logical=True),
                "memory_used_gb": round(vm.used / (1024**3), 2),
                "memory_total_gb": round(vm.total / (1024**3), 2),
                "memory_percent": vm.percent,
                "net_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
                "net_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
            })
        except Exception:
            pass

    return {
        "status": overall,
        "components": {
            "database": "online" if db_ok else "offline",
            "model_manager": "online" if models_ready else "initializing",
            "live_monitor": "running" if monitor_online else "stopped"
        },
        "host": host_info,
        "timestamp": time.time()
    }

