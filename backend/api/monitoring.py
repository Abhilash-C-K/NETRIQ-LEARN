from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.monitoring import MonitorStatus
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.monitoring_service import monitoring_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.post("/start", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def start_monitoring(req: Request):
    try:
        await monitoring_service.start(get_request_role(req))
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to start monitoring")


@router.post("/stop", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def stop_monitoring(req: Request):
    try:
        await monitoring_service.stop(get_request_role(req))
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to stop monitoring: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to stop monitoring")


@router.get("/status", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_status():
    try:
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to get monitoring status: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get monitoring status")
