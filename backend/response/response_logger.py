import time
from typing import Dict, Any, List, Optional
from backend.utils.logger import get_logger
from backend.database.collections import responses_repo
from backend.ai.contracts import Action

logger = get_logger(__name__)

class ResponseLogger:
    """
    Audit trail for every response action taken.
    Feeds the database/collections.py 'responses' collection and the Smart Summary View.
    """
    async def log_action(self, action: Action, target_ip: str, outcome: str, success: bool, context: Optional[Dict[str, Any]] = None) -> str:
        """
        Writes a structured audit entry to the database.
        Returns the ID of the created response record.
        """
        doc = {
            "timestamp": time.time(),
            "action_taken": action.value,
            "target_ip": target_ip,
            "outcome": outcome,
            "success": success,
            "context": context or {}
        }
        
        try:
            # We assume responses_repo.create() handles the insertion
            record_id = await responses_repo.create(doc)
            logger.debug(f"Response action logged (ID: {record_id}): {action.name} on {target_ip} -> Success: {success}")
            return record_id
        except Exception as e:
            # We log but do not crash the pipeline if audit logging fails
            logger.error(f"CRITICAL: Failed to write response audit log for {target_ip}: {e}")
            return ""

    async def get_response_history(self, filters: Optional[Dict[str, Any]] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Retrieves historical response actions, primarily used by the API layer.
        """
        try:
            return await responses_repo.list(filter_query=filters, limit=limit, sort_by=[("timestamp", -1)])
        except Exception as e:
            logger.error(f"Failed to fetch response history: {e}")
            return []
