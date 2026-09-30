from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List
from backend.schemas.threat import RawLog, LogQuery
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.history_service import history_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/history", tags=["history"])

@router.get("/logs", response_model=List[RawLog], dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
@router.get("/threats", response_model=List[RawLog], dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_raw_logs(req: Request, query: LogQuery = Depends()):
    try:
        filters = {}
        if query.severity and query.severity.upper() != "ALL":
            filters["severity"] = query.severity.lower()
        if query.src_ip:
            filters["src_ip"] = query.src_ip
        if query.start_time is not None:
            filters.setdefault("timestamp", {})["$gte"] = query.start_time
        if query.end_time is not None:
            filters.setdefault("timestamp", {})["$lte"] = query.end_time

        role = get_request_role(req)
        results = await history_service.get_raw_logs(role=role, filters=filters, limit=query.limit, skip=query.offset)
        return [RawLog(**item) for item in results]
    except Exception as e:
        logger.error(f"Failed to retrieve logs: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve logs")
