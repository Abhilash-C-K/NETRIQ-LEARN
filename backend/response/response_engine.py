import asyncio
import ipaddress
from typing import Dict, Any

from backend.ai.contracts import Action, PredictionResult
from backend.utils.logger import get_logger
from backend.response.firewall import get_firewall_adapter
from backend.response.quarantine import QuarantineService
from backend.response.whitelist import WhitelistManager
from backend.response.response_logger import ResponseLogger
from backend.services.incident_service import incident_service

logger = get_logger(__name__)

class ResponseEngine:
    """
    Single dispatch point for all enforcement actions based on AI verdicts.
    Strictly adheres to Layer 1 (Firewall) vs Layer 2 (Quarantine) separation.
    """
    def __init__(self):
        self.firewall = get_firewall_adapter()
        self.quarantine = QuarantineService()
        self.whitelist = WhitelistManager()
        self.logger = ResponseLogger()

    def _is_valid_ip(self, ip_str: str) -> bool:
        if not ip_str or ip_str == "unknown":
            return False
        try:
            ipaddress.ip_address(ip_str)
            return True
        except ValueError:
            return False

    async def handle_verdict(self, prediction: PredictionResult, action: Action, context: Dict[str, Any]) -> bool:
        """
        Dispatches action based on the Action enum.
        Includes try/except blocks per action so downstream failures do not crash the pipeline.
        """
        target_ip = context.get("src_ip", "unknown")
        target_mac = context.get("src_mac")
        reason = f"AI Verdict: {prediction.model_used} - Confidence: {prediction.confidence:.2f}%"

        # Validate IP before enforcement if action requires blocking/quarantining
        if action in (Action.RECOMMEND_BLOCK, Action.QUARANTINE) and not self._is_valid_ip(target_ip):
            logger.warning(f"Aborting response action {action.name}: Invalid or missing target IP '{target_ip}'")
            await self.logger.log_action(action, target_ip, "Aborted (Invalid IP)", False, context)
            return False
        
        # 1. Whitelist Check (Before Enforcement)
        if await self.whitelist.is_whitelisted(target_ip, target_mac):
            logger.info(f"Target {target_ip} is whitelisted. Bypassing response action: {action.name}")
            await self.logger.log_action(action, target_ip, "Bypassed (Whitelisted)", True, context)
            return True

        success = False
        outcome_msg = ""
        
        try:
            # 2. Dispatch based on strict architecture constraints
            if action == Action.NOTIFY:
                # Layer 1: No enforcement, just alert
                logger.info(f"Notification triggered for {target_ip}. No blocking action taken.")
                outcome_msg = "Notification Sent"
                success = True
                
            elif action == Action.RECOMMEND_BLOCK:
                # Layer 1: Recommend to external firewall
                logger.info(f"Layer 1 action initiated: Recommending Firewall block for {target_ip}")
                try:
                    success = await self.firewall.block_ip(target_ip, reason)
                    outcome_msg = "Firewall Blocked" if success else "Firewall Block Failed"
                except Exception as e:
                    logger.error(f"Firewall adapter failure during RECOMMEND_BLOCK: {e}")
                    outcome_msg = "Firewall API Error"
                    success = False
                    
            elif action == Action.QUARANTINE:
                # Layer 2: Direct internal quarantine via SDN/Endpoint
                logger.warning(f"Layer 2 action initiated: Trigerring Quarantine for internal threat {target_ip}")
                try:
                    success = await self.quarantine.quarantine_device(target_ip, target_mac, reason)
                    outcome_msg = "Quarantined" if success else "Quarantine Failed"
                except Exception as e:
                    logger.error(f"Quarantine service failure during QUARANTINE: {e}")
                    outcome_msg = "Quarantine Service Error"
                    success = False
            else:
                logger.warning(f"Unknown action type: {action}")
                outcome_msg = "Unknown Action"
                success = False
                
        except Exception as e:
            # Catch-all for unexpected dispatch failures to protect the pipeline
            logger.critical(f"Unexpected failure in response dispatch for {target_ip}: {e}")
            outcome_msg = "Internal Dispatch Error"
            success = False

        # 3. Log Audit Trail
        await self.logger.log_action(action, target_ip, outcome_msg, success, context)
        
        # 4. (Optional) Trigger Incident Service
        # We spawn a background task so it doesn't delay the live monitor
        asyncio.create_task(self._notify_incident_service(target_ip, prediction, action, success))
        
        return success

    async def _notify_incident_service(self, target_ip: str, prediction: PredictionResult, action: Action, success: bool):
        """Notifies the incident management service of the response action taken."""
        try:
            await incident_service.create_from_response_action(target_ip, prediction, action, success)
        except Exception as e:
            logger.error(f"[ResponseEngine] Failed to create incident record for {target_ip}: {e}")

    async def reverse_action(self, action: Action, target_ip: str, target_mac: str = None) -> bool:
        """
        Reverses a specific response action (e.g. unblock IP, release quarantine).
        Typically triggered by a human analyst via API.
        """
        success = False
        outcome_msg = ""
        
        try:
            if action == Action.RECOMMEND_BLOCK:
                success = await self.firewall.unblock_ip(target_ip)
                outcome_msg = "Firewall Unblocked"
            elif action == Action.QUARANTINE:
                success = await self.quarantine.release_device(target_ip, target_mac)
                outcome_msg = "Quarantine Released"
            else:
                logger.warning(f"Action {action.name} cannot be reversed.")
                return False
        except Exception as e:
            logger.error(f"Failed to reverse action {action.name} for {target_ip}: {e}")
            outcome_msg = "Reversal Failed"
            success = False

        await self.logger.log_action(action, target_ip, outcome_msg, success, {"reversal": True})
        return success
        
    async def close(self):
        """Cleanup resources."""
        for target in (self.firewall, self.quarantine):
            if hasattr(target, "close"):
                try:
                    await target.close()
                except Exception:
                    pass
