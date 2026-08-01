from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.dashboard import DashboardSummary
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.database.collections import threats_repo, incidents_repo

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardSummary, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_dashboard_summary():
    try:
        # Simplistic stub for integration
        # In a real scenario, this would call a dedicated DashboardService or use aggregation pipelines
        total_threats = len(await threats_repo.list(limit=100)) # Placeholder
        active_incidents = len(await incidents_repo.list({"status": "active"}, limit=100))
        
        return DashboardSummary(
            total_threats_blocked=total_threats,
            active_incidents=active_incidents,
            system_health="ONLINE",
            recent_activity=[]
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch dashboard data")
