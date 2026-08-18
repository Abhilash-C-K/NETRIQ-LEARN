from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List
from backend.schemas.incident import IncidentItem, IncidentUpdateReq
from backend.auth.roles import Capabilities, Role
from backend.auth.permissions import require_permission
from backend.services.incident_service import incident_service

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("", response_model=List[IncidentItem], dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def list_incidents(req: Request):
    try:
        user_role_str = req.state.user.get("role", "viewer") if hasattr(req.state, "user") and req.state.user else "viewer"
        role = Role(user_role_str) if user_role_str in [r.value for r in Role] else Role.VIEWER
        results = await incident_service.list(role=role, limit=100)
        return [IncidentItem(**item) for item in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.patch("/{incident_id}", response_model=IncidentItem, dependencies=[Depends(require_permission(Capabilities.REVERSE_RESPONSE_ACTION))])
async def update_incident(incident_id: str, req: IncidentUpdateReq):
    try:
        updates = req.dict(exclude_unset=True)
        updated = await incident_service.update(incident_id, updates)
        return IncidentItem(**updated)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
