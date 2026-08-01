from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.websocket.events import NewIncidentEvent, QuarantineActionEvent
from backend.websocket.broadcaster import broadcaster
from backend.auth.roles import Role

logger = get_logger(__name__)

class NotificationService:
    async def notify_new_incident(self, incident: Dict[str, Any]):
        """Triggers alerts for a new critical incident."""
        logger.info(f"Triggering notifications for new incident {incident.get('id')}")
        
        # 1. In-App WebSocket Notification
        event = NewIncidentEvent(payload=incident)
        await broadcaster.publish(event)
        
        # 2. Email (Stub)
        self._send_email_alert(incident)
        
        # 3. SMS (Stub)
        self._send_sms_alert(incident)
        
    async def notify_quarantine_action(self, ip_address: str, reason: str):
        """Triggers alerts when a device is quarantined."""
        event = QuarantineActionEvent(payload={"ip": ip_address, "reason": reason})
        await broadcaster.publish(event)
        
    def _send_email_alert(self, payload: Dict[str, Any]):
        # TODO: Implement SMTP adapter
        logger.debug("Email alert stub triggered.")
        pass
        
    def _send_sms_alert(self, payload: Dict[str, Any]):
        # TODO: Implement Twilio adapter
        logger.debug("SMS alert stub triggered.")
        pass

notification_service = NotificationService()
