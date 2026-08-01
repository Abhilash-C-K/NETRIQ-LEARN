import time
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.services.incident_service import incident_service
from backend.services.monitoring_service import monitoring_service
from backend.services.history_service import history_service
from backend.database.collections import threats_repo

logger = get_logger(__name__)

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

        # Real DB aggregation: threats blocked in the last 24 hours
        now = time.time()
        last_24h = now - (24 * 60 * 60)
        recent_threats = await threats_repo.get_dashboard_stats(
            time_range_start=last_24h,
            time_range_end=now,
            severity=None
        )
        threats_blocked = sum(1 for t in recent_threats if t.get("action") in ["RECOMMEND_BLOCK", "QUARANTINE"])

        if role == Role.VIEWER:
            return {
                "total_threats_blocked": threats_blocked,
                "active_incidents": len(active_incidents),
                "system_health": f"System is currently {status}. {len(active_incidents)} active incidents require attention.",
                "recent_activity": []  # Exclude raw technical data from viewer scope
            }
        else:
            # Analyst / Admin: full technical payload
            raw_logs = await history_service.get_raw_logs(role, filters={}, limit=5)
            return {
                "total_threats_blocked": threats_blocked,
                "active_incidents": len(active_incidents),
                "system_health": status.upper(),
                "recent_activity": raw_logs
            }

dashboard_service = DashboardService()
