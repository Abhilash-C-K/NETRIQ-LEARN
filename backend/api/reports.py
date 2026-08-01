from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.report import ReportGenerateReq, ReportMetadata
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/generate", response_model=ReportMetadata, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def generate_report(req: ReportGenerateReq):
    try:
        # Stub
        return ReportMetadata(
            id="rep_123",
            report_type=req.report_type,
            status="generating"
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{report_id}", response_model=ReportMetadata, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_report(report_id: str):
    try:
        return ReportMetadata(
            id=report_id,
            report_type="monthly",
            status="completed",
            download_url=f"/downloads/{report_id}.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
