from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import List
from backend.schemas.threat import RawLog, LogQuery
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.history_service import history_service

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/logs", response_model=List[RawLog], dependencies=[Depends(require_permission(Capabilities.VIEW_RAW_LOGS))])
async def get_raw_logs(req: Request, query: LogQuery = Depends()):
    try:
        filters = {"severity": query.severity} if query.severity else {}
        role = get_request_role(req)
        results = await history_service.get_raw_logs(role=role, filters=filters, limit=query.limit, skip=query.offset)
        return [RawLog(**item) for item in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
