from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.database.collections import settings_repo

router = APIRouter(prefix="/settings", tags=["settings"])

@router.get("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def get_settings():
    try:
        results = await settings_repo.list(limit=100)
        # Format as key-value
        return {item["key"]: item.get("value") for item in results if "key" in item}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.patch("", response_model=Dict[str, Any], dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def update_settings(updates: Dict[str, Any]):
    try:
        # Stub for batch update
        for key, value in updates.items():
            # In real implementation, handle upserts based on key
            pass
        return {"message": "Settings updated"}
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
