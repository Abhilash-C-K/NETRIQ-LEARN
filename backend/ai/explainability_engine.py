"""
backend/ai/explainability_engine.py

ExplainabilityEngine — routes to SHAP TreeExplainer or deviation-based z-score
depending on FusedPredictionResult.fusion_source. Never modifies risk_engine,
decision_engine, fusion_engine, or anomaly_detector internals.

Routing rule (per spec):
  fusion_source in {"supervised", "agreement"} → SHAP TreeExplainer
  fusion_source == "unsupervised"              → Deviation z-score explainer

Performance:
  TreeExplainer instances are lazy-loaded and cached in a module-level dict
  (_explainer_cache) keyed by model identity. They are NOT reconstructed per request.
"""

import time
import threading
from typing import Any, Dict, List, Optional

import numpy as np

from backend.ai.contracts import (
    ExplanationResult,
    FeatureContribution,
    FusedPredictionResult,
)
from backend.ai.anomaly_detector import EXPECTED_FEATURE_NAMES
from backend.utils.logger import get_logger
from backend.utils.exceptions import FeatureEncodingError

logger = get_logger(__name__)

shap = None
try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False
    logger.warning("[ExplainabilityEngine] shap library not installed. SHAP path will raise ExplanationError.")

# Module-level TreeExplainer cache: keyed by id(model_object) → shap.TreeExplainer
# Populated on first explain() call per model; reused for all subsequent calls.
_explainer_cache: Dict[int, Any] = {}
_cache_lock = threading.Lock()

TOP_N_DEFAULT = 10


def _get_or_create_explainer(model: Any) -> Any:
    """
    Returns a cached shap.TreeExplainer for the given model, creating one if absent.
    Thread-safe via module-level lock.
    """
    model_id = id(model)
    with _cache_lock:
        if model_id not in _explainer_cache:
            logger.info(f"[ExplainabilityEngine] Creating TreeExplainer for model id={model_id} (one-time cost).")
            if shap is None:
                raise FeatureEncodingError("SHAP is not available.")
            _explainer_cache[model_id] = shap.TreeExplainer(model)
    return _explainer_cache[model_id]


def _build_feature_vector(raw_features: Dict[str, Any]) -> np.ndarray:
    """
    Extracts values in canonical EXPECTED_FEATURE_NAMES order.
    Missing keys default to 0.0 (consistent with AnomalyDetector.predict behaviour).
    """
    return np.array([[float(raw_features.get(k, 0.0)) for k in EXPECTED_FEATURE_NAMES]])


class ExplainabilityEngine:
    """
    Routes per-prediction explainability requests to the correct explainer
    based on FusedPredictionResult.fusion_source.

    Instantiate once and reuse — TreeExplainer cache is module-level.
    """

    def __init__(self, model_manager: Any, feature_stats: Optional[Dict[str, Any]] = None):
        """
        Args:
            model_manager: Loaded ModelManager instance (provides get_model()).
            feature_stats: Per-feature benign training distribution from metadata.json
                           calibration.isolation_forest.feature_stats.
                           Required only for the deviation explainer path.
        """
        self._model_manager = model_manager
        # {feature_name: {"mean": float, "std": float}}
        self._feature_stats: Dict[str, Dict[str, float]] = feature_stats or {}

    def explain(
        self,
        fused_result: FusedPredictionResult,
        raw_features: Dict[str, Any],
        prediction_id: str,
        top_n: int = TOP_N_DEFAULT,
    ) -> ExplanationResult:
        """
        Produces a signed, ranked ExplanationResult for the given prediction.

        Args:
            fused_result: FusedPredictionResult from the prediction pipeline.
            raw_features: Original 71-feature dict from FeatureExtractor.
            prediction_id: Prediction document ID (passed through to ExplanationResult).
            top_n: Number of top contributing features to return (default 10).

        Returns:
            ExplanationResult with explanation_source, top_features, base_value.

        Raises:
            ExplanationError: On SHAP failure with no fallback possible.
        """
        fusion_source = fused_result.fusion_source

        if fusion_source in ("supervised", "agreement"):
            return self._explain_shap(fused_result, raw_features, prediction_id, top_n)
        else:  # "unsupervised"
            return self._explain_deviation(fused_result, raw_features, prediction_id, top_n)

    # ------------------------------------------------------------------
    # SHAP Path — fusion_source in {"supervised", "agreement"}
    # ------------------------------------------------------------------

    def _explain_shap(
        self,
        fused_result: FusedPredictionResult,
        raw_features: Dict[str, Any],
        prediction_id: str,
        top_n: int,
    ) -> ExplanationResult:
        """
        Runs SHAP TreeExplainer on the model that produced this prediction.
        Uses the scaled feature vector the model actually received.

        Ensemble aggregation: winning-model-only.
        Predictor routes one model per TrafficType (RF/XGBoost/LightGBM).
        There is no cross-model vote to aggregate — SHAP explains the one model
        that produced model_used in PredictionResult.
        """
        if not SHAP_AVAILABLE:
            raise ExplanationError("SHAP library unavailable. Install shap>=0.42.0.")

        from backend.ai.contracts import TrafficType
        from backend.ai.feature_encoder import FeatureEncoder

        try:
            # Determine which model was used from model_used string
            model_used = fused_result.supervised_result.model_used
            traffic_type = _infer_traffic_type(model_used)
            model = self._model_manager.get_model(traffic_type)

            # Encode + scale features exactly as Predictor does
            encoder = FeatureEncoder(self._model_manager.get_encoder())
            encoded_dict = encoder.encode(raw_features)
            feature_names = list(encoded_dict.keys())
            feature_vector = np.array([list(encoded_dict.values())])

            scaler = self._model_manager.get_scaler()
            scaled_vector = scaler.transform(feature_vector) if scaler else feature_vector

            explainer = _get_or_create_explainer(model)
            shap_values = explainer.shap_values(scaled_vector)

            # Binary classification: shap_values is list [class_0_vals, class_1_vals]
            # We want class_1 (anomaly class) contributions.
            if isinstance(shap_values, list):
                vals = shap_values[1][0]
            else:
                vals = shap_values[0]

            base_value = float(
                explainer.expected_value[1]
                if isinstance(explainer.expected_value, (list, np.ndarray))
                else explainer.expected_value
            )

            contributions = list(zip(feature_names, vals, [float(raw_features.get(k, 0.0)) for k in feature_names]))
            contributions.sort(key=lambda x: abs(x[1]), reverse=True)

            top_features = [
                FeatureContribution(
                    name=name,
                    value=obs_val,
                    contribution=round(float(shap_val), 6),
                    direction="increases_risk" if shap_val >= 0 else "decreases_risk",
                )
                for name, shap_val, obs_val in contributions[:top_n]
            ]

            logger.info(
                f"[ExplainabilityEngine:SHAP] prediction_id={prediction_id}, "
                f"model={model_used}, top_feature={top_features[0].name if top_features else 'none'}"
            )

            return ExplanationResult(
                prediction_id=prediction_id,
                explanation_source="shap",
                top_features=top_features,
                base_value=round(base_value, 6),
                generated_at=time.time(),
            )

        except ExplanationError:
            raise
        except Exception as e:
            logger.error(f"[ExplainabilityEngine:SHAP][ERROR] prediction_id={prediction_id}: {e}", exc_info=True)
            raise ExplanationError(f"SHAP explanation failed: {str(e)}") from e

    # ------------------------------------------------------------------
    # Deviation Path — fusion_source == "unsupervised"
    # ------------------------------------------------------------------

    def _explain_deviation(
        self,
        fused_result: FusedPredictionResult,
        raw_features: Dict[str, Any],
        prediction_id: str,
        top_n: int,
    ) -> ExplanationResult:
        """
        Computes per-feature z-score deviation against the BENIGN-only training distribution.

        z_score(i) = (observed_i - benign_mean_i) / benign_std_i
        contribution = z_score (signed; positive = deviates toward anomaly)
        direction = "increases_risk" if z_score > 0 else "decreases_risk"

        Structurally identical output to SHAP path — same ExplanationResult shape.
        """
        if not self._feature_stats:
            raise ExplanationError(
                "Deviation explainer requires feature_stats from metadata.json. "
                "Run scripts/train_anomaly_detector.py to generate them."
            )

        try:
            scored: List[tuple] = []
            for feat_name in EXPECTED_FEATURE_NAMES:
                obs_val = float(raw_features.get(feat_name, 0.0))
                stats = self._feature_stats.get(feat_name, {})
                mean = stats.get("mean", 0.0)
                std = stats.get("std", 1.0)

                # Protect against zero-std features (constant features in training set)
                if std < 1e-9:
                    z = 0.0
                else:
                    z = (obs_val - mean) / std

                scored.append((feat_name, obs_val, z))

            scored.sort(key=lambda x: abs(x[2]), reverse=True)

            # Base value: mean effective confidence of BENIGN flows (0.0 if not stored)
            base_value = self._feature_stats.get("_base_confidence", {}).get("mean", 0.0)

            top_features = [
                FeatureContribution(
                    name=name,
                    value=obs_val,
                    contribution=round(z_score, 6),
                    direction="increases_risk" if z_score >= 0 else "decreases_risk",
                )
                for name, obs_val, z_score in scored[:top_n]
            ]

            logger.info(
                f"[ExplainabilityEngine:Deviation] prediction_id={prediction_id}, "
                f"anomaly_score={fused_result.anomaly_score:.1f}%, "
                f"top_feature={top_features[0].name if top_features else 'none'}"
            )

            return ExplanationResult(
                prediction_id=prediction_id,
                explanation_source="deviation",
                top_features=top_features,
                base_value=base_value,
                generated_at=time.time(),
            )

        except ExplanationError:
            raise
        except Exception as e:
            logger.error(f"[ExplainabilityEngine:Deviation][ERROR] prediction_id={prediction_id}: {e}", exc_info=True)
            raise ExplanationError(f"Deviation explanation failed: {str(e)}") from e


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------

def _infer_traffic_type(model_used: str):
    """Infers TrafficType from model_used string (e.g. 'RandomForest_v1.0' → NETWORK)."""
    from backend.ai.contracts import TrafficType
    lower = model_used.lower()
    if "randomforest" in lower or "rf" in lower:
        return TrafficType.NETWORK
    if "xgboost" in lower or "xgb" in lower:
        return TrafficType.FIREWALL
    if "lightgbm" in lower or "lgbm" in lower:
        return TrafficType.SYSTEM
    # Default to NETWORK (most common in current pipeline)
    logger.warning(f"[ExplainabilityEngine] Could not infer TrafficType from '{model_used}'. Defaulting to NETWORK.")
    return TrafficType.NETWORK


class ExplanationError(Exception):
    """Raised when an explanation cannot be produced (SHAP failure, missing stats, etc.)."""
    pass
