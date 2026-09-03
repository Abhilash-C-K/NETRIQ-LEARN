from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any, Optional
from pydantic import BaseModel
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.settings_service import settings_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdateReq(BaseModel):
    """Typed allowlist for system settings. Only these keys can be updated via the API."""
    firewall_adapter_type: Optional[str] = None
    quarantine_mode: Optional[str] = None
    sandbox_mode: Optional[str] = None
    threat_retention_days: Optional[int] = None
    login_max_attempts: Optional[int] = None
    login_lockout_minutes: Optional[int] = None
    anomaly_detector_enabled: Optional[bool] = None
    high_anomaly_threshold: Optional[float] = None
    zero_day_weight: Optional[float] = None
    heuristic_min_rules_for_quarantine: Optional[int] = None


@router.get("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def get_settings():
    try:
        return await settings_service.get_settings()
    except Exception as e:
        logger.error(f"Failed to retrieve settings: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve settings")


@router.patch("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def update_settings(updates: SettingsUpdateReq, req: Request):
    try:
        # Convert to dict, dropping keys the admin left unset
        updates_dict = {k: v for k, v in updates.model_dump(exclude_unset=True).items() if v is not None}
        return await settings_service.update_settings(get_request_role(req), updates_dict)
    except Exception as e:
        logger.error(f"Failed to update settings: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update settings")

