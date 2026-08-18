from backend.ai.contracts import RiskCategory
from backend.config.config import RISK_THRESHOLDS
from backend.utils.logger import get_logger

logger = get_logger(__name__)

def classify_risk(effective_confidence: float, thresholds: dict = None) -> RiskCategory:
    """
    Pure function that maps effective confidence score to RiskCategory based on configured thresholds.
    Thresholds bounds:
    - LOW: <= LOW_MAX (default 40.0)
    - MEDIUM: > LOW_MAX and <= MEDIUM_MAX (default 70.0)
    - HIGH: > MEDIUM_MAX and <= HIGH_MAX (default 90.0)
    - CRITICAL: > HIGH_MAX (default 90.0)
    """
    t = thresholds or RISK_THRESHOLDS
    low_max = t.get("LOW_MAX", 40.0)
    medium_max = t.get("MEDIUM_MAX", 70.0)
    high_max = t.get("HIGH_MAX", 90.0)

    if effective_confidence <= low_max:
        return RiskCategory.LOW
    elif effective_confidence <= medium_max:
        return RiskCategory.MEDIUM
    elif effective_confidence <= high_max:
        return RiskCategory.HIGH
    else:
        return RiskCategory.CRITICAL


class RiskEngine:
    def __init__(self, thresholds: dict = None):
        self.thresholds = thresholds or RISK_THRESHOLDS

    def classify_risk(self, effective_confidence: float) -> RiskCategory:
        """Classifies effective confidence into RiskCategory using instance thresholds."""
        return classify_risk(effective_confidence, self.thresholds)

    def calculate_risk(self, confidence: float, anomaly_baseline: float = 0.0) -> RiskCategory:
        """
        Calculates effective confidence: min(100.0, confidence + anomaly_baseline)
        and classifies it into a RiskCategory.
        """
        effective_confidence = min(100.0, max(0.0, confidence + anomaly_baseline))
        risk = classify_risk(effective_confidence, self.thresholds)
        logger.debug(
            f"Calculated risk: {risk.name} "
            f"(Raw Conf: {confidence:.2f}, Eff Conf: {effective_confidence:.2f}, Baseline: {anomaly_baseline:.2f})"
        )
        return risk
