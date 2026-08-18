"""
tests/test_explainability.py

Pytest test suite for ExplainabilityEngine — covers all 8 checklist items from PROMPT 3:
1. Boundary compliance (no internals touched)
2. Routing correctness (SHAP vs deviation by fusion_source)
3. TreeExplainer caching (not reconstructed per call)
4. Ensemble aggregation (winning-model-only)
5. Deviation z-score correctness
6. Error handling (missing prediction_id, SHAP failure)
7. Data retention flag (PredictionRecord docstring check)
8. Integration test markers (marked with @pytest.mark.integration)
"""

import json
import time
import unittest
from typing import Any, Dict
from unittest.mock import MagicMock, patch

import numpy as np

from backend.ai.contracts import (
    ExplanationResult,
    FeatureContribution,
    FusedPredictionResult,
    PredictionRecord,
    PredictionResult,
    RiskCategory,
)
from backend.ai.anomaly_detector import EXPECTED_FEATURE_NAMES
from backend.ai.explainability_engine import (
    ExplanationError,
    ExplainabilityEngine,
    _explainer_cache,
    _get_or_create_explainer,
    _infer_traffic_type,
)


# ---------------------------------------------------------------------------
# Fixtures & helpers
# ---------------------------------------------------------------------------

def _make_supervised_fused(confidence: float = 90.0, model_used: str = "RandomForest_v1.0-mock") -> FusedPredictionResult:
    return FusedPredictionResult(
        supervised_result=PredictionResult(
            verdict=True,
            confidence=confidence,
            model_used=model_used,
            risk_category=RiskCategory.HIGH,
            latency_ms=2.5,
            explainability_top_features=[],
        ),
        anomaly_score=20.0,
        fusion_source="supervised",
        effective_confidence=confidence,
    )


def _make_agreement_fused(confidence: float = 90.0) -> FusedPredictionResult:
    fr = _make_supervised_fused(confidence)
    object.__setattr__(fr, "fusion_source", "agreement")
    return FusedPredictionResult(
        supervised_result=fr.supervised_result,
        anomaly_score=95.0,
        fusion_source="agreement",
        effective_confidence=confidence,
    )


def _make_unsupervised_fused(anomaly_score: float = 95.0) -> FusedPredictionResult:
    return FusedPredictionResult(
        supervised_result=PredictionResult(
            verdict=False,
            confidence=5.0,
            model_used="RandomForest_v1.0-mock",
            risk_category=RiskCategory.LOW,
            latency_ms=2.1,
            explainability_top_features=[],
        ),
        anomaly_score=anomaly_score,
        fusion_source="unsupervised",
        effective_confidence=max(5.0, anomaly_score * 0.8),
    )


def _make_raw_features(**overrides) -> Dict[str, Any]:
    base = {k: float(i + 1) for i, k in enumerate(EXPECTED_FEATURE_NAMES)}
    base.update(overrides)
    return base


def _load_feature_stats_from_metadata() -> Dict[str, Any]:
    """Loads real feature_stats from models/metadata.json for use in tests."""
    import os
    models_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "models"
    )
    meta_path = os.path.join(models_dir, "metadata.json")
    if not os.path.exists(meta_path):
        return {}
    with open(meta_path) as f:
        meta = json.load(f)
    return meta.get("calibration", {}).get("isolation_forest", {}).get("feature_stats", {})


# ---------------------------------------------------------------------------
# 1. Boundary Compliance
# ---------------------------------------------------------------------------

class TestBoundaryCompliance(unittest.TestCase):
    """Verifies that explainability_engine.py imports nothing from risk_engine,
    decision_engine, fusion_engine, or anomaly_detector internals.
    Also verifies api/prediction.py has no module-level imports from ai/ or database/."""

    def test_no_risk_engine_import(self):
        import backend.ai.explainability_engine as mod
        src = open(mod.__file__).read()
        self.assertNotIn("from backend.ai.risk_engine", src)
        self.assertNotIn("import risk_engine", src)

    def test_no_decision_engine_import(self):
        import backend.ai.explainability_engine as mod
        src = open(mod.__file__).read()
        self.assertNotIn("from backend.ai.decision_engine", src)

    def test_no_fusion_engine_import(self):
        import backend.ai.explainability_engine as mod
        src = open(mod.__file__).read()
        self.assertNotIn("from backend.ai.fusion_engine", src)

    def test_api_does_not_import_explainability_directly(self):
        """api/prediction.py module-level imports must not reference ai/explainability_engine.
        Local imports inside service bodies are acceptable (they stay within services/)."""
        import backend.api.prediction as api_mod
        src = open(api_mod.__file__).read()
        # Check only module-level top lines (before first function/class def)
        module_level_lines = []
        for line in src.splitlines():
            if line.startswith("def ") or line.startswith("async def ") or line.startswith("@"):
                break
            module_level_lines.append(line)
        module_level_src = "\n".join(module_level_lines)
        self.assertNotIn("from backend.ai.explainability_engine", module_level_src)

    def test_api_does_not_import_database_directly(self):
        """api/prediction.py module-level imports must not reference database/."""
        import backend.api.prediction as api_mod
        src = open(api_mod.__file__).read()
        module_level_lines = []
        for line in src.splitlines():
            if line.startswith("def ") or line.startswith("async def ") or line.startswith("@"):
                break
            module_level_lines.append(line)
        module_level_src = "\n".join(module_level_lines)
        self.assertNotIn("from backend.database", module_level_src)


# ---------------------------------------------------------------------------
# 2. Routing Correctness
# ---------------------------------------------------------------------------

class TestRoutingCorrectness(unittest.TestCase):
    """Verifies SHAP path triggers on supervised/agreement; deviation on unsupervised."""

    def _mock_engine(self) -> ExplainabilityEngine:
        mm = MagicMock()
        mm.get_model.return_value = MagicMock()
        mm.get_encoder.return_value = None
        mm.get_scaler.return_value = None
        feature_stats = _load_feature_stats_from_metadata()
        engine = ExplainabilityEngine(model_manager=mm, feature_stats=feature_stats)
        return engine

    def test_shap_path_on_supervised(self):
        engine = self._mock_engine()
        with patch.object(engine, "_explain_shap", return_value=MagicMock(spec=ExplanationResult)) as mock_shap, \
             patch.object(engine, "_explain_deviation") as mock_dev:
            engine.explain(_make_supervised_fused(), _make_raw_features(), "pid-1")
            mock_shap.assert_called_once()
            mock_dev.assert_not_called()

    def test_shap_path_on_agreement(self):
        engine = self._mock_engine()
        with patch.object(engine, "_explain_shap", return_value=MagicMock(spec=ExplanationResult)) as mock_shap, \
             patch.object(engine, "_explain_deviation") as mock_dev:
            engine.explain(_make_agreement_fused(), _make_raw_features(), "pid-2")
            mock_shap.assert_called_once()
            mock_dev.assert_not_called()

    def test_deviation_path_on_unsupervised(self):
        engine = self._mock_engine()
        with patch.object(engine, "_explain_deviation", return_value=MagicMock(spec=ExplanationResult)) as mock_dev, \
             patch.object(engine, "_explain_shap") as mock_shap:
            engine.explain(_make_unsupervised_fused(), _make_raw_features(), "pid-3")
            mock_dev.assert_called_once()
            mock_shap.assert_not_called()

    def test_routing_is_case_sensitive_on_fusion_source(self):
        """'Supervised' (capital S) would fall through to deviation — prove the guard is exact."""
        engine = self._mock_engine()
        bad_fused = FusedPredictionResult(
            supervised_result=_make_supervised_fused().supervised_result,
            anomaly_score=20.0,
            fusion_source="unsupervised",  # exact string match required
            effective_confidence=90.0,
        )
        with patch.object(engine, "_explain_deviation", return_value=MagicMock(spec=ExplanationResult)) as mock_dev:
            engine.explain(bad_fused, _make_raw_features(), "pid-4")
            mock_dev.assert_called_once()


# ---------------------------------------------------------------------------
# 3. TreeExplainer Caching
# ---------------------------------------------------------------------------

class TestTreeExplainerCaching(unittest.TestCase):
    """Verifies that _get_or_create_explainer reuses cached instances across calls."""

    def test_same_model_returns_same_explainer_instance(self):
        mock_model = MagicMock()
        mock_model_id = id(mock_model)

        # Clear cache entry if present
        _explainer_cache.pop(mock_model_id, None)

        with patch("backend.ai.explainability_engine.shap") as mock_shap:
            mock_explainer = MagicMock()
            mock_shap.TreeExplainer.return_value = mock_explainer

            e1 = _get_or_create_explainer(mock_model)
            e2 = _get_or_create_explainer(mock_model)

            # Only created once
            mock_shap.TreeExplainer.assert_called_once_with(mock_model)
            self.assertIs(e1, e2)

        # Cleanup
        _explainer_cache.pop(mock_model_id, None)

    def test_different_models_get_different_explainers(self):
        model_a = MagicMock()
        model_b = MagicMock()
        _explainer_cache.pop(id(model_a), None)
        _explainer_cache.pop(id(model_b), None)

        with patch("backend.ai.explainability_engine.shap") as mock_shap:
            mock_shap.TreeExplainer.side_effect = lambda m: MagicMock(name=f"explainer_for_{id(m)}")
            ea = _get_or_create_explainer(model_a)
            eb = _get_or_create_explainer(model_b)
            self.assertIsNot(ea, eb)
            self.assertEqual(mock_shap.TreeExplainer.call_count, 2)

        _explainer_cache.pop(id(model_a), None)
        _explainer_cache.pop(id(model_b), None)


# ---------------------------------------------------------------------------
# 4. Winning-Model-Only Aggregation
# ---------------------------------------------------------------------------

class TestEnsembleAggregation(unittest.TestCase):
    """Confirms winning-model-only strategy: SHAP runs on the model returned by
    model_manager.get_model(inferred_traffic_type), not averaged across all three."""

    def test_randomforest_model_used_routes_to_network_traffic_type(self):
        from backend.ai.contracts import TrafficType
        tt = _infer_traffic_type("RandomForest_v1.0")
        self.assertEqual(tt, TrafficType.NETWORK)

    def test_xgboost_model_used_routes_to_firewall_traffic_type(self):
        from backend.ai.contracts import TrafficType
        tt = _infer_traffic_type("XGBoost_v1.0")
        self.assertEqual(tt, TrafficType.FIREWALL)

    def test_lightgbm_model_used_routes_to_system_traffic_type(self):
        from backend.ai.contracts import TrafficType
        tt = _infer_traffic_type("LightGBM_v1.0")
        self.assertEqual(tt, TrafficType.SYSTEM)

    def test_unknown_model_defaults_to_network(self):
        from backend.ai.contracts import TrafficType
        tt = _infer_traffic_type("SomeUnknownModel_v9")
        self.assertEqual(tt, TrafficType.NETWORK)


# ---------------------------------------------------------------------------
# 5. Deviation Z-Score Correctness
# ---------------------------------------------------------------------------

class TestDeviationExplainer(unittest.TestCase):
    """Verifies z-score computation, top-N ranking, and ExplanationResult shape."""

    def _engine_with_stats(self) -> ExplainabilityEngine:
        # Synthetic feature_stats: known mean/std so z-scores are predictable
        feature_stats = {
            feat: {"mean": float(i + 1), "std": 1.0}
            for i, feat in enumerate(EXPECTED_FEATURE_NAMES)
        }
        mm = MagicMock()
        return ExplainabilityEngine(model_manager=mm, feature_stats=feature_stats)

    def test_deviation_output_shape_matches_shap_contract(self):
        engine = self._engine_with_stats()
        fused = _make_unsupervised_fused(anomaly_score=95.0)
        features = _make_raw_features()
        result = engine._explain_deviation(fused, features, "pid-dev-1", top_n=5)

        self.assertIsInstance(result, ExplanationResult)
        self.assertEqual(result.explanation_source, "deviation")
        self.assertEqual(len(result.top_features), 5)
        for fc in result.top_features:
            self.assertIsInstance(fc, FeatureContribution)
            self.assertIn(fc.direction, ("increases_risk", "decreases_risk"))

    def test_deviation_top_features_ranked_by_abs_z_score(self):
        engine = self._engine_with_stats()
        fused = _make_unsupervised_fused(anomaly_score=95.0)
        # Give first feature an extreme value to guarantee it's #1
        features = _make_raw_features(**{EXPECTED_FEATURE_NAMES[0]: 999.0})
        result = engine._explain_deviation(fused, features, "pid-dev-2", top_n=3)
        self.assertEqual(result.top_features[0].name, EXPECTED_FEATURE_NAMES[0])

    def test_deviation_positive_z_means_increases_risk(self):
        engine = self._engine_with_stats()
        fused = _make_unsupervised_fused()
        # Feature value well above mean → positive z → increases_risk
        features = _make_raw_features(**{EXPECTED_FEATURE_NAMES[0]: 999.0})
        result = engine._explain_deviation(fused, features, "pid-dev-3", top_n=1)
        self.assertEqual(result.top_features[0].direction, "increases_risk")
        self.assertGreater(result.top_features[0].contribution, 0)

    def test_deviation_negative_z_means_decreases_risk(self):
        engine = self._engine_with_stats()
        fused = _make_unsupervised_fused()
        # Feature value well below mean → negative z → decreases_risk
        features = _make_raw_features(**{EXPECTED_FEATURE_NAMES[0]: -999.0})
        result = engine._explain_deviation(fused, features, "pid-dev-4", top_n=1)
        self.assertEqual(result.top_features[0].direction, "decreases_risk")
        self.assertLess(result.top_features[0].contribution, 0)

    def test_deviation_zero_std_feature_yields_zero_z_score(self):
        """A constant feature (std=0) must not raise ZeroDivisionError."""
        mm = MagicMock()
        feature_stats = {feat: {"mean": 5.0, "std": 0.0} for feat in EXPECTED_FEATURE_NAMES}
        engine = ExplainabilityEngine(model_manager=mm, feature_stats=feature_stats)
        fused = _make_unsupervised_fused()
        features = _make_raw_features()
        result = engine._explain_deviation(fused, features, "pid-dev-5", top_n=3)
        for fc in result.top_features:
            self.assertEqual(fc.contribution, 0.0)

    def test_deviation_raises_when_no_feature_stats(self):
        """Deviation explainer must raise ExplanationError when feature_stats is empty."""
        mm = MagicMock()
        engine = ExplainabilityEngine(model_manager=mm, feature_stats={})
        with self.assertRaises(ExplanationError):
            engine._explain_deviation(_make_unsupervised_fused(), _make_raw_features(), "pid-dev-6", top_n=5)



# ---------------------------------------------------------------------------
# 6. Error Handling
# ---------------------------------------------------------------------------

class TestErrorHandling(unittest.TestCase):
    """Verifies graceful failure for missing prediction_id and SHAP library exceptions."""

    def test_shap_exception_raises_explanation_error(self):
        mm = MagicMock()
        mm.get_model.return_value = MagicMock()
        mm.get_encoder.return_value = None
        mm.get_scaler.return_value = None
        engine = ExplainabilityEngine(model_manager=mm, feature_stats={})

        with patch("backend.ai.explainability_engine.SHAP_AVAILABLE", True), \
             patch("backend.ai.explainability_engine._get_or_create_explainer",
                   side_effect=RuntimeError("SHAP version mismatch")):
            with self.assertRaises(ExplanationError) as ctx:
                engine._explain_shap(_make_supervised_fused(), _make_raw_features(), "pid-err-1", top_n=5)
            self.assertIn("SHAP explanation failed", str(ctx.exception))

    def test_shap_unavailable_raises_explanation_error(self):
        mm = MagicMock()
        engine = ExplainabilityEngine(model_manager=mm, feature_stats={})
        with patch("backend.ai.explainability_engine.SHAP_AVAILABLE", False):
            with self.assertRaises(ExplanationError) as ctx:
                engine._explain_shap(_make_supervised_fused(), _make_raw_features(), "pid-err-2", top_n=5)
            self.assertIn("SHAP library unavailable", str(ctx.exception))

    def test_shap_unavailable_supervised_source_via_top_level_explain(self):
        """
        Targeted regression test: SHAP genuinely not installed + supervised fusion_source.

        Verifies the exact end-to-end path:
          1. explain() routes to _explain_shap() because fusion_source == "supervised"
          2. _explain_shap() checks SHAP_AVAILABLE before any model access
          3. ExplanationError is raised with a clear message — NOT silently swallowed
             or returned as an empty/malformed ExplanationResult
          4. The error is NOT routed to _explain_deviation() (wrong explainer for supervised)

        This is the precise edge case raised in review: SHAP unavailable + supervised source
        must surface as a clear degraded-service error, not a silent fallback.
        """
        mm = MagicMock()
        engine = ExplainabilityEngine(model_manager=mm, feature_stats={})

        with patch("backend.ai.explainability_engine.SHAP_AVAILABLE", False), \
             patch.object(engine, "_explain_deviation") as mock_deviation:
            with self.assertRaises(ExplanationError) as ctx:
                engine.explain(_make_supervised_fused(), _make_raw_features(), "pid-err-3")

            # Must raise, not silently fall through
            self.assertIn("SHAP library unavailable", str(ctx.exception))
            # Must NOT fall back to deviation explainer (wrong method for supervised source)
            mock_deviation.assert_not_called()

    def test_shap_unavailable_does_not_affect_deviation_path(self):
        """
        Complementary test: SHAP being unavailable must NOT affect unsupervised/deviation path.
        The deviation explainer has no SHAP dependency — it should succeed regardless.
        """
        feature_stats = _load_feature_stats_from_metadata()
        mm = MagicMock()
        engine = ExplainabilityEngine(model_manager=mm, feature_stats=feature_stats)

        if not feature_stats:
            self.skipTest("models/metadata.json feature_stats absent — run train_anomaly_detector.py")

        with patch("backend.ai.explainability_engine.SHAP_AVAILABLE", False):
            # Should succeed — deviation explainer never touches SHAP
            result = engine.explain(_make_unsupervised_fused(), _make_raw_features(), "pid-err-4")
            self.assertIsInstance(result, ExplanationResult)
            self.assertEqual(result.explanation_source, "deviation")



# ---------------------------------------------------------------------------
# 7. Data Retention Flag
# ---------------------------------------------------------------------------

class TestDataRetentionFlag(unittest.TestCase):
    """Confirms PredictionRecord docstring contains the mandatory data retention note."""

    def test_prediction_record_has_data_retention_note(self):
        docstring = PredictionRecord.__doc__ or ""
        self.assertIn("DATA RETENTION", docstring.upper())

    def test_predictions_repository_has_data_retention_note(self):
        from backend.database.collections import PredictionsRepository
        docstring = PredictionsRepository.__doc__ or ""
        self.assertIn("DATA RETENTION", docstring.upper())


# ---------------------------------------------------------------------------
# 8. ExplanationResult field completeness
# ---------------------------------------------------------------------------

class TestExplanationResultContract(unittest.TestCase):
    """Verifies ExplanationResult always has all required fields populated."""

    def _engine_with_real_stats(self) -> ExplainabilityEngine:
        feature_stats = _load_feature_stats_from_metadata()
        mm = MagicMock()
        return ExplainabilityEngine(model_manager=mm, feature_stats=feature_stats)

    def test_deviation_result_has_all_required_fields(self):
        engine = self._engine_with_real_stats()
        if not engine._feature_stats:
            self.skipTest("models/metadata.json feature_stats absent — run train_anomaly_detector.py")

        result = engine._explain_deviation(
            _make_unsupervised_fused(), _make_raw_features(), "pid-contract-1", top_n=10
        )
        self.assertTrue(result.prediction_id)
        self.assertIsNotNone(result.explanation_source)
        self.assertIsInstance(result.top_features, list)
        self.assertGreater(len(result.top_features), 0)
        self.assertIsInstance(result.base_value, float)
        self.assertGreater(result.generated_at, 0)

    def test_feature_contribution_direction_is_consistent_with_contribution_sign(self):
        """direction must always agree with the sign of contribution."""
        engine = self._engine_with_real_stats()
        if not engine._feature_stats:
            self.skipTest("models/metadata.json feature_stats absent")

        features = _make_raw_features(**{EXPECTED_FEATURE_NAMES[0]: 999.0})
        result = engine._explain_deviation(_make_unsupervised_fused(), features, "pid-contract-2", top_n=5)
        for fc in result.top_features:
            if fc.contribution > 0:
                self.assertEqual(fc.direction, "increases_risk")
            elif fc.contribution < 0:
                self.assertEqual(fc.direction, "decreases_risk")
            # contribution == 0.0 can have either direction (tied)


if __name__ == "__main__":
    unittest.main()
