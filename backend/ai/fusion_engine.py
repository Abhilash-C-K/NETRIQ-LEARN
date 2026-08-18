from typing import Literal
from backend.ai.contracts import PredictionResult, FusedPredictionResult
import backend.config.config as config
from backend.utils.logger import get_logger

logger = get_logger(__name__)

def fuse(supervised_result: PredictionResult, anomaly_score: float) -> FusedPredictionResult:
    """
    Fuses output from the supervised model ensemble and the unsupervised Isolation Forest anomaly detector
    into a single FusedPredictionResult with an effective_confidence score.

    Fusion Rules:
    - Feature Toggle (ANOMALY_DETECTOR_ENABLED=False): Passes through supervised confidence unmodified.
    
    - Case A (Agreement): Supervised ensemble predicts ANOMALY (verdict=True) AND unsupervised anomaly_score
      is HIGH (>= HIGH_ANOMALY_THRESHOLD). Both systems agree on threat.
      -> fusion_source="agreement", effective_confidence = supervised_result.confidence

    - Case B (Zero-Day Case): Supervised ensemble predicts BENIGN (verdict=False) BUT unsupervised anomaly_score
      is HIGH (>= HIGH_ANOMALY_THRESHOLD). Unsupervised detector flags potential novel zero-day attack.
      -> fusion_source="unsupervised", effective_confidence = max(supervised.confidence, anomaly_score * ZERO_DAY_WEIGHT)

    - Case C (Supervised Attack Dominance): Supervised ensemble predicts ANOMALY (verdict=True) BUT unsupervised
      anomaly_score is LOW (< HIGH_ANOMALY_THRESHOLD). Known attack signatures override low unsupervised score.
      -> fusion_source="supervised", effective_confidence = supervised_result.confidence
    """
    enabled = getattr(config, "ANOMALY_DETECTOR_ENABLED", True)
    zero_day_weight = getattr(config, "ZERO_DAY_WEIGHT", 0.8)
    high_threshold = getattr(config, "HIGH_ANOMALY_THRESHOLD", 70.0)

    # 1. Feature Toggle Check: If disabled, pass through supervised confidence cleanly
    if not enabled:
        logger.debug("[FusionEngine] Anomaly detector disabled. Passing through supervised-only result.")
        return FusedPredictionResult(
            supervised_result=supervised_result,
            anomaly_score=anomaly_score,
            fusion_source="supervised",
            effective_confidence=supervised_result.confidence
        )

    # 2. Case A: Both Supervised and Unsupervised agree on Anomaly
    if supervised_result.verdict and anomaly_score >= high_threshold:
        logger.info(f"[FusionEngine:CaseA] Both engines agree on anomaly (Supervised: {supervised_result.confidence:.1f}%, Anomaly Score: {anomaly_score:.1f}%).")
        return FusedPredictionResult(
            supervised_result=supervised_result,
            anomaly_score=anomaly_score,
            fusion_source="agreement",
            effective_confidence=supervised_result.confidence
        )

    # 3. Case B: Zero-Day Escalation (Supervised = BENIGN, Anomaly Score = HIGH)
    if (not supervised_result.verdict) and anomaly_score >= high_threshold:
        weighted_score = anomaly_score * zero_day_weight
        effective_conf = max(supervised_result.confidence, weighted_score)
        logger.warning(
            f"[FusionEngine:CaseB] Zero-Day Threat Detected! Supervised=BENIGN ({supervised_result.confidence:.1f}%), "
            f"Anomaly Score={anomaly_score:.1f}%. Escalating effective_confidence to {effective_conf:.1f}%."
        )
        return FusedPredictionResult(
            supervised_result=supervised_result,
            anomaly_score=anomaly_score,
            fusion_source="unsupervised",
            effective_confidence=effective_conf
        )

    # 4. Case C: Supervised Attack Dominance (Supervised = ANOMALY, Anomaly Score = LOW)
    if supervised_result.verdict and anomaly_score < high_threshold:
        logger.info(
            f"[FusionEngine:CaseC] Supervised attack confirmed ({supervised_result.confidence:.1f}%). "
            f"Low anomaly score ({anomaly_score:.1f}%) does not veto known-attack signature."
        )
        return FusedPredictionResult(
            supervised_result=supervised_result,
            anomaly_score=anomaly_score,
            fusion_source="supervised",
            effective_confidence=supervised_result.confidence
        )

    # 5. Default: Standard Benign Agreement
    return FusedPredictionResult(
        supervised_result=supervised_result,
        anomaly_score=anomaly_score,
        fusion_source="supervised",
        effective_confidence=supervised_result.confidence
    )


class FusionEngine:
    """Class wrapper around fusion logic for dependency injection or service use."""
    def fuse(self, supervised_result: PredictionResult, anomaly_score: float) -> FusedPredictionResult:
        return fuse(supervised_result, anomaly_score)
