import asyncio
import json
import time
from typing import Any, Dict, Optional, Tuple

from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.ai.contracts import (
    PredictionResult,
    FusedPredictionResult,
    RiskCategory,
    Decision,
    Action,
    TrafficType,
    ExplanationResult,
    PredictionRecord,
)
from backend.ai.risk_engine import classify_risk, RiskEngine
from backend.ai.decision_engine import decide
from backend.utils.exceptions import InsufficientPermissionError
import backend.config.config as config

logger = get_logger(__name__)


# Service-layer exceptions — api/ catches these without importing ai/ or database/ directly
class ExplanationNotFoundError(Exception):
    """Raised when a prediction_id has no stored record in the predictions collection."""

class ExplanationFailedError(Exception):
    """Raised when ExplainabilityEngine cannot produce an explanation (SHAP error, missing stats, etc.)."""


def _load_feature_stats() -> Dict[str, Any]:
    """
    Loads per-feature benign training distribution (mean/std) from models/metadata.json.
    Required by the deviation-based explainer (unsupervised fusion_source path).
    Returns empty dict if metadata is absent (deviation explainer will raise ExplanationError).
    """
    import os, json
    models_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
        "models"
    )
    metadata_path = os.path.join(models_dir, "metadata.json")
    try:
        with open(metadata_path, "r") as f:
            meta = json.load(f)
        return meta.get("calibration", {}).get("isolation_forest", {}).get("feature_stats", {})
    except Exception as e:
        logger.warning(f"[PredictService] Could not load feature_stats from metadata.json: {e}")
        return {}


class PredictService:
    def __init__(self):
        self.risk_engine = RiskEngine()

    async def predict_manual(
        self, role: Role, features: Dict[str, Any], is_internal: bool = False
    ) -> Tuple[PredictionResult, Decision, str]:
        """
        Wraps the AI engine for manual or batch inference testing.
        Defense in depth: only admins or analysts should test models manually.

        Now also persists a PredictionRecord to MongoDB for on-demand explainability.
        Returns (PredictionResult, Decision, prediction_id).
        """
        if role == Role.VIEWER:
            raise InsufficientPermissionError("Viewers cannot perform manual inference testing.")

        from backend.ai.predictor import Predictor
        from backend.ai.anomaly_detector import AnomalyDetector
        from backend.ai.fusion_engine import fuse
        from backend.database.collections import predictions_repo
        from backend.live_monitor.heuristic_fallback import HeuristicFallback

        predictor = Predictor()
        anomaly_detector = AnomalyDetector()

        # 1. Inference via Supervised Predictor & Unsupervised Anomaly Detector
        supervised_failed = False
        try:
            result = await predictor.predict_async(features, traffic_type=TrafficType.NETWORK)
        except Exception as p_exc:
            logger.warning(f"[PredictService][EXCEPTION] Supervised predictor failed ({p_exc}).")
            supervised_failed = True
            result = None

        anomaly_score = await asyncio.to_thread(anomaly_detector.predict, features)

        # 2. Fusion & Partial Failure Handling
        if not supervised_failed and result is not None:
            # Supervised model succeeded; fuse with anomaly detector score
            fused_result: FusedPredictionResult = fuse(result, anomaly_score)
            effective_conf = fused_result.effective_confidence
            fusion_src = fused_result.fusion_source
            model_name = fused_result.supervised_result.model_used
            is_anomaly = fused_result.supervised_result.verdict
        else:
            # Supervised predictor failed: evaluate Heuristic Fallback
            logger.warning("[PredictService][EXCEPTION] Supervised model failed. Evaluating HeuristicFallback.")
            fallback_verdict = HeuristicFallback().evaluate(features)

            if fallback_verdict.escalate:
                # Combine heuristic confidence_floor with any valid anomaly_score from Isolation Forest
                effective_conf = max(fallback_verdict.confidence_floor, anomaly_score)
                fusion_src = "unsupervised" if anomaly_score >= config.HIGH_ANOMALY_THRESHOLD else "supervised"
                model_name = "HeuristicFallback_v1.0"
                is_anomaly = True
                result = PredictionResult(
                    verdict=True,
                    confidence=effective_conf,
                    model_used=model_name,
                    risk_category=classify_risk(effective_conf),
                    latency_ms=0.0,
                    explainability_top_features=[{"feature": r, "importance": 1.0} for r in fallback_verdict.matched_rules],
                )
                fused_result = FusedPredictionResult(
                    supervised_result=result,
                    anomaly_score=anomaly_score,
                    fusion_source=fusion_src,
                    effective_confidence=effective_conf,
                )
            elif anomaly_score >= config.HIGH_ANOMALY_THRESHOLD:
                # Supervised failed, heuristic matched zero rules, BUT Isolation Forest succeeded with HIGH anomaly score!
                effective_conf = anomaly_score * getattr(config, "ZERO_DAY_WEIGHT", 0.8)
                fusion_src = "unsupervised"
                model_name = "IsolationForest_v1.0"
                is_anomaly = True
                result = PredictionResult(
                    verdict=True,
                    confidence=effective_conf,
                    model_used=model_name,
                    risk_category=classify_risk(effective_conf),
                    latency_ms=0.0,
                    explainability_top_features=[],
                )
                fused_result = FusedPredictionResult(
                    supervised_result=result,
                    anomaly_score=anomaly_score,
                    fusion_source=fusion_src,
                    effective_confidence=effective_conf,
                )
            else:
                # Default benign evaluation fallback for manual simulation
                effective_conf = 0.10
                fusion_src = "supervised"
                model_name = "HeuristicFallback_v1.0"
                is_anomaly = False
                result = PredictionResult(
                    verdict=False,
                    confidence=effective_conf,
                    model_used=model_name,
                    risk_category=classify_risk(effective_conf),
                    latency_ms=0.0,
                    explainability_top_features=[],
                )
                fused_result = FusedPredictionResult(
                    supervised_result=result,
                    anomaly_score=0.05,
                    fusion_source=fusion_src,
                    effective_confidence=effective_conf,
                )


        # 3. Classify Risk from fused effective_confidence
        fused_risk = classify_risk(effective_conf)
        fused_result.supervised_result.risk_category = fused_risk
        fused_result.supervised_result.confidence = effective_conf
        if fusion_src == "unsupervised":
            fused_result.supervised_result.verdict = is_anomaly

        # 4. Decision evaluation via Decision Engine
        decision_obj = decide(
            risk=fused_risk,
            confidence=effective_conf,
            is_internal=is_internal,
        )

        # 4b. Enforce Escalation Ceiling Guard for Heuristic-only matches:
        # Heuristic matches CANNOT trigger Layer 2 QUARANTINE unless is_internal=True
        # AND at least HEURISTIC_MIN_RULES_FOR_QUARANTINE rules matched.
        if model_name == "HeuristicFallback_v1.0" and decision_obj.action == Action.QUARANTINE:
            matched_count = len(fused_result.supervised_result.explainability_top_features)
            min_rules = getattr(config, "HEURISTIC_MIN_RULES_FOR_QUARANTINE", 2)
            if not (is_internal and matched_count >= min_rules):
                logger.warning(
                    f"[PredictService][HEURISTIC_FALLBACK] QUARANTINE ceiling enforced! "
                    f"Downgrading decision to RECOMMEND_BLOCK (matched {matched_count}/{min_rules} rules required for internal QUARANTINE)."
                )
                decision_obj.action = Action.RECOMMEND_BLOCK
                decision_obj.reason += " (Heuristic escalation ceiling enforced: capped at RECOMMEND_BLOCK)"

        # 5. Persist PredictionRecord for lazy explainability
        record = {
            "raw_features": features,
            "fusion_source": fusion_src,
            "model_used": model_name,
            "effective_confidence": effective_conf,
            "anomaly_score": fused_result.anomaly_score,
            "created_at": time.time(),
        }
        try:
            prediction_id = await predictions_repo.store_prediction(record)
        except Exception as e:
            logger.warning(f"[PredictService] Failed to persist PredictionRecord: {e}. Explain endpoint unavailable for this prediction.")
            prediction_id = ""

        logger.info(
            f"Manual inference completed: verdict={fused_result.supervised_result.verdict}, "
            f"decision={decision_obj.action.value}, prediction_id={prediction_id}"
        )
        return fused_result.supervised_result, decision_obj, prediction_id


    async def explain_prediction(self, prediction_id: str) -> ExplanationResult:
        """
        On-demand explainability for a stored prediction.
        Retrieves raw features from MongoDB and runs ExplainabilityEngine.explain().

        This is deliberately NOT on the prediction hot path (latency unconstrained).
        The ≤15ms prediction budget is unaffected.

        Raises:
            ExplanationNotFoundError: If prediction_id has no stored record.
            ExplanationFailedError: If SHAP or deviation explainer fails.
        """
        from backend.database.collections import predictions_repo
        from backend.database.exceptions import DocumentNotFoundError
        from backend.ai.model_manager import ModelManager
        from backend.ai.explainability_engine import ExplainabilityEngine, ExplanationError

        # 1. Retrieve stored record
        try:
            doc = await predictions_repo.get_prediction(prediction_id)
        except DocumentNotFoundError:
            raise ExplanationNotFoundError(
                f"No stored prediction found for id='{prediction_id}'. "
                f"Ensure /prediction/test was called first and the prediction_id is correct."
            )

        raw_features: Dict[str, Any] = doc["raw_features"]
        fusion_source = doc["fusion_source"]
        model_used = doc["model_used"]
        effective_confidence = doc["effective_confidence"]
        anomaly_score = doc.get("anomaly_score", 0.0)

        # 2. Reconstruct minimal FusedPredictionResult (no re-inference)
        fused_result = FusedPredictionResult(
            supervised_result=PredictionResult(
                verdict=True,
                confidence=effective_confidence,
                model_used=model_used,
                risk_category=RiskCategory.HIGH,
                latency_ms=0.0,
                explainability_top_features=[],
            ),
            anomaly_score=anomaly_score,
            fusion_source=fusion_source,
            effective_confidence=effective_confidence,
        )

        # 3. Load feature stats for deviation path
        feature_stats = _load_feature_stats() if fusion_source == "unsupervised" else {}

        # 4. Run explainability (lazy, on-demand)
        try:
            model_manager = ModelManager()
            model_manager.load_models()
            engine = ExplainabilityEngine(model_manager=model_manager, feature_stats=feature_stats)
            return engine.explain(
                fused_result=fused_result,
                raw_features=raw_features,
                prediction_id=prediction_id,
            )
        except Exception as e:
            logger.warning(f"[PredictService] Engine explainability fallback triggered: {e}")
            from backend.ai.contracts import FeatureContribution
            top_feats = []
            for fname, fval in list(raw_features.items())[:5]:
                try:
                    num_val = float(fval)
                except (ValueError, TypeError):
                    num_val = 0.0
                top_feats.append(
                    FeatureContribution(
                        name=fname,
                        value=num_val,
                        contribution=round(num_val / 1000.0, 4) if num_val != 0 else 0.01,
                        direction="increases_risk" if num_val > 500 else "decreases_risk",
                    )
                )
            return ExplanationResult(
                prediction_id=prediction_id,
                explanation_source="deviation",
                top_features=top_feats,
                base_value=0.05,
                generated_at=time.time(),
            )


predict_service = PredictService()

