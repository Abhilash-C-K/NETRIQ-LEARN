from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.analytics import TimeRangeQuery, TrendSeries, DataPoint
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.analytics_service import analytics_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/trends", response_model=TrendSeries, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_trends(req: Request, query: TimeRangeQuery = Depends()):
    try:
        role = get_request_role(req)
        result = await analytics_service.get_trends(
            role=role,
            start_time=query.start_time,
            end_time=query.end_time
        )
        return TrendSeries.model_validate(result)
    except Exception as e:
        logger.error(f"Failed to fetch analytics trends: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch analytics"
        )

