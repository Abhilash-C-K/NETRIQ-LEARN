from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.analytics import TimeRangeQuery, TrendSeries
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/trends", response_model=TrendSeries, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_trends(query: TimeRangeQuery = Depends()):
    try:
        # Stub
        return TrendSeries(
            series_name="Threats Blocked",
            data=[]
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch analytics")
