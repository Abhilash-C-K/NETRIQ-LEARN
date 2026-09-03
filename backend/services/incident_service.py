import re
import time
from typing import Dict, Any, List, Optional
from backend.utils.logger import get_logger
from backend.database.collections import incidents_repo
from backend.services.notification_service import notification_service
from backend.auth.roles import Role
from backend.ai.contracts import PredictionResult, Action

logger = get_logger(__name__)

IPV4_REGEX = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
IPV6_REGEX = re.compile(r"\b(?:[0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b")

class IncidentService:
    @staticmethod
    def _redact_description(description: str, affected_assets: Optional[List[str]] = None) -> str:
        if not description:
            return ""
        redacted = description
        if affected_assets:
            for asset in affected_assets:
                if asset and isinstance(asset, str):
                    redacted = redacted.replace(asset, "Protected Asset")
        redacted = IPV4_REGEX.sub("Protected Asset", redacted)
        return IPV6_REGEX.sub("Protected Asset", redacted)

    async def list(self, role: Role, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns incidents. Viewers receive a simplified summary with redacted IPs; Analysts/Admins get full records."""
        results = await incidents_repo.list(limit=limit)
        if role == Role.VIEWER:
            # Strip internal technical fields and redact IP addresses from description
            return [
                {
                    "id": item.get("id"),
                    "status": item.get("status"),
                    "severity": item.get("severity"),
                    "description": self._redact_description(item.get("description", ""), item.get("affected_assets")),
                    "created_at": item.get("created_at"),
                    "updated_at": None,
                    "affected_assets": None,
                    "response_action": None,
                    "response_success": None,
                    "notes": None,
                }
                for item in results
            ]
        return results

    async def update(self, incident_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        updates["updated_at"] = time.time()
        await incidents_repo.update(incident_id, updates)
        return await incidents_repo.get(incident_id)

    async def create_from_response_action(self, target_ip: str, prediction: PredictionResult, action: Action, success: bool):
        """
        Triggered by ResponseEngine when an enforcement action is taken.
        Links the threat to an incident record and fires notifications.
        """
        # Create Incident record
        incident_doc = {
            "status": "active",
            "severity": prediction.risk_category.value,
            "description": f"AI Verdict ({prediction.model_used}): {action.name} executed against {target_ip}",
            "created_at": time.time(),
            "updated_at": time.time(),
            "affected_assets": [target_ip],
            "response_action": action.value,
            "response_success": success
        }
        
        try:
            incident_id = await incidents_repo.create(incident_doc)
            logger.info(f"Created Incident {incident_id} for target {target_ip}")
            
            # Add ID to doc for broadcasting
            incident_doc["id"] = incident_id
            
            # Notify
            await notification_service.notify_new_incident(incident_doc)
            
            if action == Action.QUARANTINE:
                await notification_service.notify_quarantine_action(target_ip, f"Quarantined under Incident {incident_id}")
                
        except Exception as e:
            logger.error(f"Failed to create incident from response action: {e}")

incident_service = IncidentService()
