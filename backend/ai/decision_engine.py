from typing import Dict, Any
from backend.ai.contracts import RiskCategory, Action
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class DecisionEngine:
    def __init__(self):
        pass

    def evaluate(self, risk_category: RiskCategory, context: Dict[str, Any]) -> Action:
        """
        Decides action based on locked architecture:
        - Layer 1: returns RECOMMEND_BLOCK (firewall enforces later) or NOTIFY
        - Layer 2: triggers QUARANTINE directly on internal threats.
        """
        is_internal = context.get("is_internal", False)
        
        # Layer 2: Internal Threats
        if is_internal and risk_category in [RiskCategory.HIGH, RiskCategory.CRITICAL]:
            logger.info("Layer 2 condition met: Triggering direct QUARANTINE for internal threat.")
            return Action.QUARANTINE
            
        # Layer 1: External Threats / Lower Risk Internal
        if risk_category in [RiskCategory.HIGH, RiskCategory.CRITICAL]:
            logger.info("Layer 1 condition met: Recommending firewall BLOCK.")
            return Action.RECOMMEND_BLOCK
            
        logger.info("Layer 1 condition met: Risk is low/medium, issuing NOTIFY only.")
        return Action.NOTIFY
