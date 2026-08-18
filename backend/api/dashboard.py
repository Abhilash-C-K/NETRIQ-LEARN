from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.dashboard import DashboardSummary
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("", response_model=DashboardSummary, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_dashboard_summary(req: Request):
    try:
        role = get_request_role(req)
        summary_dict = await dashboard_service.get_summary(role=role)
        return DashboardSummary(**summary_dict)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch dashboard data")
