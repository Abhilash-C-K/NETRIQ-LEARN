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
        if query.search:
            s = query.search.strip()
            filters["$or"] = [
                {"src_ip": {"$regex": s, "$options": "i"}},
                {"dst_ip": {"$regex": s, "$options": "i"}},
                {"prediction": {"$regex": s, "$options": "i"}},
            ]
        elif query.ip:
            filters["$or"] = [
                {"src_ip": query.ip.strip()},
                {"dst_ip": query.ip.strip()},
            ]
        else:
            if query.src_ip:
                filters["src_ip"] = query.src_ip.strip()
            if query.dst_ip:
                filters["dst_ip"] = query.dst_ip.strip()
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


@router.delete("/clear-all", dependencies=[Depends(require_permission(Capabilities.TRIGGER_QUARANTINE))])
async def clear_all_threat_logs():
    """Clears old threat logs so the system only reflects fresh live flows."""
    try:
        from backend.database.collections import threats_repo
        res = await threats_repo.collection.delete_many({})
        logger.info(f"Cleared {res.deleted_count} threat logs from MongoDB.")
        return {"status": "success", "deleted_count": res.deleted_count}
    except Exception as e:
        logger.error(f"Failed to clear threat logs: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to clear threat logs: {str(e)}")
