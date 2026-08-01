from typing import List, Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import threats_repo

logger = get_logger(__name__)

class HistoryService:
    async def get_raw_logs(self, role: Role, filters: Dict[str, Any], limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """
        Query engine for raw logs and historical threats.
        Defense in Depth: Validates role scoping even if API layer enforces.
        """
        if role == Role.VIEWER:
            logger.warning("Viewer role attempted to access raw logs. Denied at service layer.")
            return [] # Viewers cannot access raw logs

        try:
            return await threats_repo.list(filter_query=filters, limit=limit, skip=skip)
        except Exception as e:
            logger.error(f"Failed to fetch raw logs: {e}")
            return []
