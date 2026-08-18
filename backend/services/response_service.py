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

response_service = ResponseService()
