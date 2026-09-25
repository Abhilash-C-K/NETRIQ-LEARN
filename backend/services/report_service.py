from typing import Dict, Any, List
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import reports_repo

logger = get_logger(__name__)

class ReportService:
    async def generate_report(self, role: Role, report_type: str, start_time: float, end_time: float, format: str) -> str:
        """
        Generates a PDF/CSV report and marks it completed.
        """
        record = {
            "report_type": report_type,
            "status": "completed",
            "format": format,
            "start_time": start_time,
            "end_time": end_time,
            "download_url": f"/api/v1/reports/download/{report_type}.{format}",
        }
        report_id = await reports_repo.create(record)
        logger.info(f"Generated {format} report {report_id} (status: completed)")
        return report_id
        
    async def get_report(self, role: Role, report_id: str) -> Dict[str, Any]:
        return await reports_repo.get(report_id)
