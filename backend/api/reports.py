import time
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from backend.schemas.report import ReportGenerateReq, ReportMetadata
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.report_service import report_service
from backend.utils.exceptions import DocumentNotFoundError
from backend.utils.logger import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate", response_model=ReportMetadata, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def generate_report(req: ReportGenerateReq, request: Request):
    try:
        role = get_request_role(request)
        now = time.time()
        start = req.start_time if req.start_time is not None else (now - 86400)
        end = req.end_time if req.end_time is not None else now
        report_id = await report_service.generate_report(
            role=role,
            report_type=req.report_type,
            start_time=start,
            end_time=end,
            format=req.format
        )
        return ReportMetadata(
            id=report_id,
            report_type=req.report_type,
            status="completed",
            download_url=f"/api/v1/reports/{report_id}/download"
        )
    except Exception as e:
        logger.error(f"Failed to generate report: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to generate report")


@router.get("/download/{filename}", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def download_report_by_filename(filename: str, request: Request):
    """
    Direct file download alias matching the download_url emitted during report creation.
    """
    try:
        role = get_request_role(request)
        pdf_bytes, _ = await report_service.build_pdf(report_id="export", role=role)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Failed to download report {filename}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to download PDF: {e}")


@router.get("/{report_id}/download", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def download_report_by_id(report_id: str, request: Request):
    """
    Streams a real ReportLab-generated SOC PDF document for the specified report ID.
    """
    try:
        role = get_request_role(request)
        pdf_bytes, filename = await report_service.build_pdf(report_id=report_id, role=role)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Failed to build PDF report {report_id}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to generate PDF: {e}")


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
