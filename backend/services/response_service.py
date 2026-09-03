from typing import Optional
from backend.response.response_engine import ResponseEngine
from backend.ai.contracts import Action
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class ResponseService:
    def __init__(self):
        self.engine = ResponseEngine()

    async def reverse_action(self, action: Action, target_ip: str, target_mac: Optional[str] = None) -> bool:
        """Invokes the ResponseEngine to reverse an enforcement action."""
        logger.info(f"Reversing response action {action.name} for target IP {target_ip}")
        return await self.engine.reverse_action(action=action, target_ip=target_ip, target_mac=target_mac)

    async def quarantine_action(self, target_ip: str, target_mac: Optional[str] = None, reason: str = "Manual Quarantine") -> bool:
        """Invokes the QuarantineService directly to enforce Layer 2 device quarantine."""
        logger.warning(f"Manual quarantine enforcement triggered for {target_ip}")
        success = await self.engine.quarantine.quarantine_device(target_ip, target_mac, reason)
        await self.engine.logger.log_action(Action.QUARANTINE, target_ip, "Manual Quarantine", success, {"manual": True})
        return success

response_service = ResponseService()

