import time
import asyncio
import numpy as np
from typing import Dict, Any, List
from backend.ai.contracts import PredictionResult, TrafficType, RiskCategory
from backend.ai.model_manager import ModelManager
from backend.ai.risk_engine import RiskEngine
from backend.utils.logger import get_logger
from backend.utils.exceptions import PredictionError

logger = get_logger(__name__)

class Predictor:
    def __init__(self):
        self.model_manager = ModelManager()
        self.model_manager.load_models()
        self.risk_engine = RiskEngine()

    def predict(self, raw_features: Dict[str, Any], traffic_type: TrafficType, anomaly_baseline: float = 0.0) -> PredictionResult:
        start_time = time.perf_counter()
        try:
            model = self.model_manager.get_model(traffic_type)
            model_name = str(self.model_manager.get_model_name(traffic_type))
            raw_thresh = self.model_manager.get_threshold(traffic_type)
            threshold = float(raw_thresh) if isinstance(raw_thresh, (int, float)) else 0.5

            # Branch: SYSTEM uses an event-sequence vectorizer, not named numeric fields
            if traffic_type == TrafficType.SYSTEM:
                vectorizer = self.model_manager.get_system_vectorizer()
                event_sequence = raw_features.get("event_sequence")
                if not event_sequence:
                    raise PredictionError("[SCHEMA_MISMATCH] SYSTEM traffic requires 'event_sequence' (list of event IDs).")
                doc = " ".join(event_sequence)
                feature_vector = vectorizer.transform([doc]).astype(np.float64)
                feature_names = list(vectorizer.vocabulary_.keys())

            # NETWORK and FIREWALL: named numeric features, per-model order from metadata
            else:
                feature_names = self.model_manager.get_feature_names(traffic_type)
                if not isinstance(feature_names, (list, tuple)):
                    if hasattr(self.model_manager, "get_scaler"):
                        scaler = self.model_manager.get_scaler()
                        if hasattr(scaler, "feature_names_in_"):
                            feature_names = list(scaler.feature_names_in_)
                        else:
                            feature_names = []
                    else:
                        feature_names = []
                if not feature_names:
                    raise PredictionError(f"[CONFIG_ERROR] No feature schema found for {traffic_type}.")
                missing = [f for f in feature_names if f not in raw_features]
                if missing:
                    logger.error(f"[SCHEMA_MISMATCH] Missing features for {traffic_type}: {missing[:5]}")
                    raise PredictionError(f"[SCHEMA_MISMATCH] Missing {len(missing)} required features for {traffic_type}.")
                feature_vector = np.array([[float(raw_features[f]) for f in feature_names]])

            # Predict using the model's calibrated threshold
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(feature_vector)[0]
                specialist_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
                verdict = bool(specialist_prob >= threshold)
                confidence = specialist_prob * 100.0
            else:
                pred = model.predict(feature_vector)[0]
                verdict = bool(pred)
                confidence = 100.0 if verdict else 0.0
                specialist_prob = confidence / 100.0

            risk_category = self.risk_engine.calculate_risk(confidence, anomaly_baseline)
            explainability = self._generate_explainability(model, feature_names)
            latency_ms = (time.perf_counter() - start_time) * 1000.0

            return PredictionResult(
                verdict=verdict,
                confidence=confidence,
                model_used=model_name,
                risk_category=risk_category,
                latency_ms=latency_ms,
                explainability_top_features=explainability
            )

        except PredictionError:
            raise
        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            raise PredictionError(f"Inference failed: {str(e)}") from e

    def _generate_explainability(self, model: Any, feature_names: List[str]) -> List[Dict[str, Any]]:
        top_features = []
        try:
            base_model = getattr(model, "estimator", None) or (
                model.calibrated_classifiers_[0].estimator
                if hasattr(model, "calibrated_classifiers_") else None
            ) or model
            if hasattr(base_model, "feature_importances_"):
                importances = base_model.feature_importances_
                pairs = sorted(zip(feature_names, importances), key=lambda x: x[1], reverse=True)
                for name, imp in pairs[:3]:
                    top_features.append({"feature": name, "importance": round(float(imp), 4)})
        except Exception as e:
            logger.warning(f"Failed to generate explainability: {e}")
        return top_features

    async def predict_async(self, raw_features: Dict[str, Any], traffic_type: TrafficType, anomaly_baseline: float = 0.0) -> PredictionResult:
        return await asyncio.to_thread(self.predict, raw_features, traffic_type, anomaly_baseline)
