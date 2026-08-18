from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.settings_service import settings_service

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def get_settings():
    try:
        return await settings_service.get_settings()
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.patch("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def update_settings(updates: Dict[str, Any], req: Request):
    try:
        return await settings_service.update_settings(get_request_role(req), updates)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
