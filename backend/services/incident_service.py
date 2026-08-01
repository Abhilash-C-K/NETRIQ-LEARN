import time
from typing import Dict, Any, List
from backend.utils.logger import get_logger
from backend.database.collections import incidents_repo
from backend.services.notification_service import notification_service
from backend.auth.roles import Role
from backend.ai.contracts import PredictionResult, Action

logger = get_logger(__name__)

class IncidentService:
    async def list(self, role: Role, limit: int = 100) -> List[Dict[str, Any]]:
        return await incidents_repo.list(limit=limit)

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
