from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.report import ReportGenerateReq, ReportMetadata
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.report_service import ReportService
from backend.utils.exceptions import DocumentNotFoundError
from backend.utils.logger import get_logger

logger = get_logger(__name__)
report_service = ReportService()

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportMetadata, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def generate_report(req: ReportGenerateReq, request: Request):
    try:
        role = get_request_role(request)
        report_id = await report_service.generate_report(
            role=role,
            report_type=req.report_type,
            start_time=req.start_time,
            end_time=req.end_time,
            format=req.format
        )
        return ReportMetadata(id=report_id, report_type=req.report_type, status="generating")
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate report")


@router.get("/{report_id}", response_model=ReportMetadata, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_report(report_id: str, request: Request):
    try:
        role = get_request_role(request)
        doc = await report_service.get_report(role=role, report_id=report_id)
        return ReportMetadata(**doc)
    except DocumentNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Report '{report_id}' not found")
    except Exception as e:
        logger.error(f"Failed to retrieve report {report_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve report")

