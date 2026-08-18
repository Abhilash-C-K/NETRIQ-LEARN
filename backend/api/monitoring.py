from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.monitoring import MonitorStatus
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.monitoring_service import monitoring_service

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.post("/start", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def start_monitoring(req: Request):
    try:
        await monitoring_service.start(get_request_role(req))
        return MonitorStatus(is_running=True, mode="active", uptime_seconds=0.0, packets_processed=0)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/stop", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def stop_monitoring(req: Request):
    try:
        await monitoring_service.stop(get_request_role(req))
        return MonitorStatus(is_running=False, mode="stopped", uptime_seconds=0.0, packets_processed=0)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/status", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_status():
    try:
        is_running = monitoring_service._is_running
        mode = "active" if is_running else "stopped"
        return MonitorStatus(is_running=is_running, mode=mode, uptime_seconds=0.0, packets_processed=0)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
