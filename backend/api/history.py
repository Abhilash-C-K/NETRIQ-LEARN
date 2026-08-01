from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.schemas.threat import RawLog, LogQuery
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.database.collections import threats_repo

router = APIRouter(prefix="/history", tags=["history"])

@router.get("/logs", response_model=List[RawLog], dependencies=[Depends(require_permission(Capabilities.VIEW_RAW_LOGS))])
async def get_raw_logs(query: LogQuery = Depends()):
    try:
        filters = {}
        if query.severity:
            filters["severity"] = query.severity
            
        results = await threats_repo.list(filter_query=filters, limit=query.limit, skip=query.offset)
        return [RawLog(**item) for item in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
