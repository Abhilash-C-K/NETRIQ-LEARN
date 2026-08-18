import unittest
from unittest.mock import patch
from backend.ai.contracts import RiskCategory, Action, PredictionResult, FusedPredictionResult
from backend.ai.fusion_engine import fuse, FusionEngine
from backend.ai.anomaly_detector import AnomalyDetector, EXPECTED_FEATURE_NAMES
from backend.ai.risk_engine import classify_risk
from backend.ai.decision_engine import decide
import backend.config.config as config


def _make_benign(confidence: float = 5.0) -> PredictionResult:
    return PredictionResult(
        verdict=False,
        confidence=confidence,
        model_used="RandomForest_v1.0",
        risk_category=RiskCategory.LOW,
        latency_ms=2.1,
        explainability_top_features=[]
    )


def _make_anomaly(confidence: float = 90.0) -> PredictionResult:
    return PredictionResult(
        verdict=True,
        confidence=confidence,
        model_used="RandomForest_v1.0",
        risk_category=RiskCategory.HIGH,
        latency_ms=2.5,
        explainability_top_features=[]
    )


def _full_feature_dict(**overrides) -> dict:
    """Returns a complete 71-feature dict matching EXPECTED_FEATURE_NAMES, all zeros unless overridden."""
    base = {k: 0.0 for k in EXPECTED_FEATURE_NAMES}
    base.update(overrides)
    return base


class TestZeroDayFusion(unittest.TestCase):

    # ==========================================
    # 1. FUSION ENGINE CASE A — Agreement
    # ==========================================

    def test_case_a_agreement(self):
        """Case A: Both supervised and unsupervised agree on anomaly -> effective_confidence = supervised."""
        fused = fuse(_make_anomaly(90.0), anomaly_score=95.0)
        self.assertEqual(fused.fusion_source, "agreement")
        self.assertEqual(fused.effective_confidence, 90.0)

    # ==========================================
    # 2. FUSION ENGINE CASE B — Zero-Day Escalation
    # ==========================================

    def test_case_b_zero_day_escalation(self):
        """
        Case B: Zero-Day Case (Supervised=BENIGN, Anomaly Score=95.0%).
        With ZERO_DAY_WEIGHT = 0.8:
            effective_confidence = max(5.0, 95.0 * 0.8) = 76.0%
        Escalates to HIGH risk category.
        """
        fused = fuse(_make_benign(5.0), anomaly_score=95.0)
        self.assertEqual(fused.fusion_source, "unsupervised")
        self.assertEqual(fused.effective_confidence, 76.0)

        # Verify escalation propagates correctly through RiskEngine (unmodified)
        risk = classify_risk(fused.effective_confidence)
        self.assertEqual(risk, RiskCategory.HIGH)

    # ==========================================
    # 3. FUSION ENGINE CASE C — Supervised Dominance
    # ==========================================

    def test_case_c_supervised_dominance(self):
        """Case C: Supervised attack signature overrides low unsupervised score — no veto."""
        fused = fuse(_make_anomaly(90.0), anomaly_score=20.0)
        self.assertEqual(fused.fusion_source, "supervised")
        self.assertEqual(fused.effective_confidence, 90.0)

    # ==========================================
    # 4. Threshold Exact Edge Cases
    # ==========================================

    def test_case_b_exactly_at_threshold(self):
        """Boundary: anomaly_score == HIGH_ANOMALY_THRESHOLD (70.0) triggers Case B, not default benign."""
        fused = fuse(_make_benign(5.0), anomaly_score=70.0)
        self.assertEqual(fused.fusion_source, "unsupervised")
        self.assertEqual(fused.effective_confidence, max(5.0, 70.0 * config.ZERO_DAY_WEIGHT))

    def test_case_c_just_below_threshold(self):
        """Boundary: anomaly_score == 69.9 (just below threshold) + supervised ANOMALY -> Case C."""
        fused = fuse(_make_anomaly(90.0), anomaly_score=69.9)
        self.assertEqual(fused.fusion_source, "supervised")
        self.assertEqual(fused.effective_confidence, 90.0)

    # ==========================================
    # 5. Feature Toggle Disabled Pass-Through
    # ==========================================

    def test_anomaly_detector_disabled_toggle(self):
        """ANOMALY_DETECTOR_ENABLED=False: pass-through supervised confidence regardless of anomaly_score."""
        original = config.ANOMALY_DETECTOR_ENABLED
        try:
            config.ANOMALY_DETECTOR_ENABLED = False
            fused = fuse(_make_benign(5.0), anomaly_score=95.0)
            self.assertEqual(fused.fusion_source, "supervised")
            self.assertEqual(fused.effective_confidence, 5.0)
        finally:
            config.ANOMALY_DETECTOR_ENABLED = original

    # ==========================================
    # 6. Inference Exception Fail-Safe (model loaded, inference crashes)
    # ==========================================

    def test_inference_exception_failsafe(self):
        """
        [EXCEPTION] tag path: model is loaded but decision_function raises.
        AnomalyDetector must return 0.0 and log [EXCEPTION] without crashing.
        Confirmed equivalent to ANOMALY_DETECTOR_ENABLED=False from fuse()'s perspective.
        """
        detector = AnomalyDetector()
        if detector._model is None:
            self.skipTest("Model artifact not present; skipping inference-exception test.")

        # Corrupt the feature dict so sklearn raises (empty dict -> no keys -> all-zero 71-vector is valid,
        # so we force a bad type that bypasses float conversion and causes an exception)
        with patch.object(detector._model, "decision_function", side_effect=RuntimeError("forced test failure")):
            score = detector.predict(_full_feature_dict())
        self.assertEqual(score, 0.0)

    # ==========================================
    # 7. Model-Absent Fail-Safe (artifact missing at load time)
    # ==========================================

    def test_model_absent_failsafe_returns_zero(self):
        """
        [ABSENT] tag path: model was never loaded (e.g. artifact missing).
        AnomalyDetector.predict() must return 0.0 without raising.
        This is operationally equivalent to ANOMALY_DETECTOR_ENABLED=False —
        the fuse() pass-through receives anomaly_score=0.0, which is below
        HIGH_ANOMALY_THRESHOLD and does not escalate.
        """
        detector = AnomalyDetector()
        original_model = detector._model
        try:
            detector._model = None  # Simulate absent artifact
            score = detector.predict(_full_feature_dict())
            self.assertEqual(score, 0.0)

            # Confirm fuse() produces supervised-only pass-through with anomaly_score=0.0
            fused = fuse(_make_benign(5.0), anomaly_score=score)
            self.assertEqual(fused.fusion_source, "supervised")
            self.assertEqual(fused.effective_confidence, 5.0)
        finally:
            detector._model = original_model

    # ==========================================
    # 8. Score Clamping — [0.0, 100.0] boundary
    # ==========================================

    def test_anomaly_score_clamping(self):
        """AnomalyDetector output is always clamped to [0.0, 100.0]."""
        detector = AnomalyDetector()
        if detector._model is None:
            self.skipTest("Model artifact not present; skipping clamping test.")

        # Extreme feature values — should not produce out-of-range scores
        features = _full_feature_dict(**{k: 1e9 for k in EXPECTED_FEATURE_NAMES})
        score = detector.predict(features)
        self.assertGreaterEqual(score, 0.0)
        self.assertLessEqual(score, 100.0)

    # ==========================================
    # 9. End-to-End Integration — Layer 1 + Layer 2 routing
    # ==========================================

    def test_zero_day_end_to_end_decision_routing(self):
        """
        Integration: Zero-day flow (BENIGN supervised, 95.0% Anomaly) escalates
        through Fusion -> RiskEngine -> DecisionEngine to Layer 1 and Layer 2 actions.
        """
        fused = fuse(_make_benign(5.0), anomaly_score=95.0)  # effective_confidence = 76.0%

        risk = classify_risk(fused.effective_confidence)
        self.assertEqual(risk, RiskCategory.HIGH)

        d_l1 = decide(risk=risk, confidence=fused.effective_confidence, is_internal=False)
        self.assertEqual(d_l1.action, Action.RECOMMEND_BLOCK)
        self.assertEqual(d_l1.target_layer, "Layer 1")

        d_l2 = decide(risk=risk, confidence=fused.effective_confidence, is_internal=True)
        self.assertEqual(d_l2.action, Action.QUARANTINE)
        self.assertEqual(d_l2.target_layer, "Layer 2")


if __name__ == "__main__":
    unittest.main()
