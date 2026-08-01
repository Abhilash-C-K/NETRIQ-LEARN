from backend.ai.contracts import RiskCategory
from backend.config.config import RISK_THRESHOLDS
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class RiskEngine:
    def __init__(self, thresholds: dict = None):
        self.thresholds = thresholds or RISK_THRESHOLDS

    def calculate_risk(self, confidence: float, anomaly_baseline: float = 0.0) -> RiskCategory:
        """
        Maps raw confidence to risk categories (LOW, MEDIUM, HIGH, CRITICAL).
        Factors in the anomaly_baseline from live_monitor/statistics.py (simulated here).
        """
        # Baseline adjustment: If the environment is already anomalous, bump effective confidence slightly
        # For simplicity, we just add the baseline directly (assuming baseline is scaled 0-10 or similar).
        effective_confidence = min(100.0, confidence + anomaly_baseline)
        
        low_max = self.thresholds.get("LOW_MAX", 40.0)
        medium_max = self.thresholds.get("MEDIUM_MAX", 70.0)
        high_max = self.thresholds.get("HIGH_MAX", 90.0)

        if effective_confidence <= low_max:
            risk = RiskCategory.LOW
        elif effective_confidence <= medium_max:
            risk = RiskCategory.MEDIUM
        elif effective_confidence <= high_max:
            risk = RiskCategory.HIGH
        else:
            risk = RiskCategory.CRITICAL
            
        logger.debug(
            f"Calculated risk: {risk.name} "
            f"(Raw Conf: {confidence:.2f}, Eff Conf: {effective_confidence:.2f}, Baseline: {anomaly_baseline:.2f})"
        )
        return risk
