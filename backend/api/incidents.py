from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List
from backend.schemas.incident import IncidentItem, IncidentUpdateReq
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.incident_service import incident_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/incidents", tags=["incidents"])

@router.get("", response_model=List[IncidentItem], dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def list_incidents(req: Request):
    try:
        role = get_request_role(req)
        results = await incident_service.list(role=role, limit=100)
        return [IncidentItem(**item) for item in results]
    except Exception as e:
        logger.error(f"Failed to list incidents: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve incidents")

@router.patch("/{incident_id}", response_model=IncidentItem, dependencies=[Depends(require_permission(Capabilities.REVERSE_RESPONSE_ACTION))])
async def update_incident(incident_id: str, req: IncidentUpdateReq):
    try:
        updates = req.model_dump(exclude_unset=True)
        updated = await incident_service.update(incident_id, updates)
        return IncidentItem(**updated)
    except Exception as e:
        logger.error(f"Failed to update incident {incident_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update incident")

@router.get("/{incident_id}/countermeasures", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_incident_countermeasures(incident_id: str):
    try:
        return await incident_service.get_countermeasures(incident_id)
    except Exception as e:
        logger.error(f"Failed to get countermeasures for {incident_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate countermeasures")


@router.delete("/clear-all", dependencies=[Depends(require_permission(Capabilities.TRIGGER_QUARANTINE))])
async def clear_all_incidents():
    """Wipes historical test incident records so the live SOC console starts completely fresh."""
    try:
        from backend.database.collections import incidents_repo
        res = await incidents_repo.collection.delete_many({})
        logger.info(f"Cleared {res.deleted_count} historical incidents from MongoDB.")
        return {"status": "success", "deleted_count": res.deleted_count}
    except Exception as e:
        logger.error(f"Failed to clear incidents: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to clear incidents")

