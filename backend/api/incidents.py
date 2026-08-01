from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.schemas.incident import IncidentItem, IncidentUpdateReq
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.database.collections import incidents_repo

router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("", response_model=List[IncidentItem], dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def list_incidents():
    try:
        results = await incidents_repo.list(limit=100)
        return [IncidentItem(**item) for item in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.patch("/{incident_id}", response_model=IncidentItem, dependencies=[Depends(require_permission(Capabilities.REVERSE_RESPONSE_ACTION))])
async def update_incident(incident_id: str, req: IncidentUpdateReq):
    try:
        updates = req.dict(exclude_unset=True)
        await incidents_repo.update(incident_id, updates)
        updated = await incidents_repo.get(incident_id)
        return IncidentItem(**updated)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
