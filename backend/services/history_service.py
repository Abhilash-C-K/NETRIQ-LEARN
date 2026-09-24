from typing import List, Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import threats_repo

logger = get_logger(__name__)

class HistoryService:
    async def get_raw_logs(self, role: Role, filters: Dict[str, Any], limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """
        Query engine for raw logs and historical threats.
        Defense in Depth:
        - Bulk queries (no src_ip): Viewers are denied (returns []).
        - Targeted Device Trail (src_ip specified): Viewers can view connection metadata, but raw_data and internal telemetry are stripped.
        - Admin & Analyst receive full log details.
        """
        is_targeted_device_query = bool(filters.get("src_ip"))

        if role == Role.VIEWER and not is_targeted_device_query:
            logger.warning("Viewer role attempted to access bulk raw logs. Denied at service layer.")
            return []

        try:
            # Sort newest first by default
            sort_order = [("timestamp", -1)]
            docs = await threats_repo.list(
                filter_query=filters,
                limit=limit,
                skip=skip,
                sort_by=sort_order
            )

            if role == Role.VIEWER:
                # Sanitize records for Viewer: strip raw feature vectors/payloads
                sanitized = []
                for doc in docs:
                    clean = {
                        "id": doc.get("id"),
                        "timestamp": doc.get("timestamp"),
                        "src_ip": doc.get("src_ip"),
                        "dst_ip": doc.get("dst_ip"),
                        "src_port": doc.get("src_port", 0),
                        "dst_port": doc.get("dst_port", 0),
                        "protocol": doc.get("protocol", "TCP"),
                        "sni": doc.get("sni"),
                        "prediction": doc.get("prediction", "BENIGN"),
                        "confidence": doc.get("confidence", 0.0),
                        "severity": doc.get("severity", "LOW"),
                        "action": doc.get("action", "NOTIFY"),
                        "action_taken": doc.get("action", "NOTIFY"),
                        "is_anomaly": doc.get("is_anomaly", False),
                        "is_internal": doc.get("is_internal", False),
                        "raw_data": None,
                    }
                    sanitized.append(clean)
                return sanitized

            return docs
        except Exception as e:
            logger.error(f"Failed to fetch raw logs: {e}")
            return []

history_service = HistoryService()
