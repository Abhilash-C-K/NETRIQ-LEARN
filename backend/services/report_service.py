import time
from typing import Dict, Any, List, Tuple
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import reports_repo, threats_repo
from backend.services.dashboard_service import dashboard_service
from backend.services.pdf_generator import build_soc_pdf_report

logger = get_logger(__name__)

class ReportService:
    async def generate_report(self, role: Role, report_type: str, start_time: float, end_time: float, format: str) -> str:
        """
        Creates report record and marks it completed.
        """
        record = {
            "report_type": report_type,
            "status": "completed",
            "format": format.lower(),
            "start_time": start_time,
            "end_time": end_time,
            "created_at": time.time(),
            "download_url": f"/api/v1/reports/download/{report_type}.{format.lower()}",
        }
        report_id = await reports_repo.create(record)
        logger.info(f"Generated {format} report {report_id} (status: completed)")
        return report_id
        
    async def get_report(self, role: Role, report_id: str) -> Dict[str, Any]:
        return await reports_repo.get(report_id)

    async def build_pdf(self, report_id: str, role: Role) -> Tuple[bytes, str]:
        """
        Retrieves real report telemetry and builds a real ReportLab PDF document.
        """
        doc = {}
        try:
            doc = await reports_repo.get(report_id)
        except Exception:
            pass

        report_type = doc.get("report_type", "incident_summary")
        now = time.time()
        start_time = doc.get("start_time", now - 86400)
        end_time = doc.get("end_time", now)

        # Query real database threats
        recent_threats = await threats_repo.get_dashboard_stats(
            time_range_start=start_time,
            time_range_end=end_time,
            severity=None
        )

        # Get dashboard summary stats
        summary_stats = await dashboard_service.get_summary(role)

        pdf_bytes = build_soc_pdf_report(
            report_id=report_id,
            report_type=report_type,
            start_time=start_time,
            end_time=end_time,
            threats=recent_threats,
            summary_stats=summary_stats,
        )

        filename = f"netriq_{report_type}_{report_id[:8]}.pdf"
        return pdf_bytes, filename

report_service = ReportService()
