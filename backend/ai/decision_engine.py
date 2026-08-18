import time
from typing import Dict, Any
from backend.ai.contracts import RiskCategory, Action, Decision
from backend.utils.logger import get_logger

logger = get_logger(__name__)

def decide(risk: RiskCategory, confidence: float, is_internal: bool) -> Decision:
    """
    Decides system action based on single source of truth (RiskCategory):
    - Layer 2 Rule (Internal Asset, is_internal=True): risk in {HIGH, CRITICAL} -> direct QUARANTINE.
    - Layer 1 Rule (External Asset, is_internal=False): risk in {HIGH, CRITICAL} -> RECOMMEND_BLOCK.
    - Otherwise (LOW, MEDIUM): Action.NOTIFY (notification / log-only).
    """
    now = time.time()
    actionable = risk in [RiskCategory.HIGH, RiskCategory.CRITICAL]

    if actionable and is_internal:
        logger.info(f"Layer 2 condition met: Direct QUARANTINE for internal asset (Risk: {risk.name}).")
        return Decision(
            action=Action.QUARANTINE,
            target_layer="Layer 2",
            reason=f"Layer 2 Auto-Quarantine: Internal asset threat detected with {risk.name} risk level (Confidence: {confidence:.1f}%).",
            timestamp=now
        )
    elif actionable and not is_internal:
        logger.info(f"Layer 1 condition met: Recommending firewall BLOCK (Risk: {risk.name}).")
        return Decision(
            action=Action.RECOMMEND_BLOCK,
            target_layer="Layer 1",
            reason=f"Layer 1 Recommendation: Actionable threat detected with {risk.name} risk level (Confidence: {confidence:.1f}%). External firewall action recommended.",
            timestamp=now
        )
    else:
        logger.info(f"Condition met: Risk level {risk.name} below actionable threshold, issuing NOTIFY only.")
        return Decision(
            action=Action.NOTIFY,
            target_layer="Layer 2" if is_internal else "Layer 1",
            reason=f"Notification: Threat logged with {risk.name} risk level (Confidence: {confidence:.1f}%).",
            timestamp=now
        )


class DecisionEngine:
    """Class wrapper around decision engine for dependency injection or service use."""
    def decide(self, risk: RiskCategory, confidence: float, is_internal: bool) -> Decision:
        return decide(risk, confidence, is_internal)

    def evaluate(self, risk_category: RiskCategory, context: Dict[str, Any]) -> Action:
        """Legacy dictionary-context interface returning bare Action enum."""
        is_internal = context.get("is_internal", False)
        confidence = context.get("confidence", 0.0)
        decision_obj = decide(risk_category, confidence, is_internal)
        return decision_obj.action
