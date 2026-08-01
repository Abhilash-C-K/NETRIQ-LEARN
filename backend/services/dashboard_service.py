from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.services.incident_service import incident_service
from backend.services.history_service import HistoryService
from backend.services.monitoring_service import monitoring_service

logger = get_logger(__name__)
history_service = HistoryService()

class DashboardService:
    async def get_summary(self, role: Role) -> Dict[str, Any]:
        """
        Composes dashboard data based on role scope.
        Viewer: Plain-English summary.
        Analyst/Admin: Full technical payload.
        """
        # Fetch active incidents via service (not DB directly)
        active_incidents = await incident_service.list(role, limit=10)
        
        # Determine monitoring status
        status = "active" if monitoring_service._is_running else "stopped"
        
        if role == Role.VIEWER:
            return {
                "total_threats_blocked": 42, # Mock aggregation
                "active_incidents": len(active_incidents),
                "system_health": f"System is currently {status}. {len(active_incidents)} active incidents require attention.",
                "recent_activity": [] # Exclude raw technical data
            }
        else:
            # Analyst / Admin
            # Fetch raw technical logs
            raw_logs = await history_service.get_raw_logs(role, filters={}, limit=5)
            return {
                "total_threats_blocked": 42,
                "active_incidents": len(active_incidents),
                "system_health": status.upper(),
                "recent_activity": raw_logs
            }

dashboard_service = DashboardService()
