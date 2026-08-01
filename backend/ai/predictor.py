import time
import numpy as np
from typing import Dict, Any, List
from backend.ai.contracts import PredictionResult, TrafficType, RiskCategory
from backend.ai.model_manager import ModelManager
from backend.ai.feature_encoder import FeatureEncoder
from backend.ai.risk_engine import RiskEngine
from backend.utils.logger import get_logger
from backend.utils.exceptions import PredictionError

try:
    import shap
    SHAP_AVAILABLE = True
except ImportError:
    SHAP_AVAILABLE = False

logger = get_logger(__name__)

class Predictor:
    def __init__(self):
        self.model_manager = ModelManager()
        # Initialize models and encoders
        self.model_manager.load_models()
        self.feature_encoder = FeatureEncoder(self.model_manager.get_encoder())
        self.risk_engine = RiskEngine()
        self._feature_names = [] # Could be loaded from metadata if available

    def predict(self, raw_features: Dict[str, Any], traffic_type: TrafficType, anomaly_baseline: float = 0.0) -> PredictionResult:
        """
        Main inference entry point.
        1. Start timer.
        2. Encode and scale features.
        3. Route to the correct model based on traffic_type.
        4. Predict and generate confidence.
        5. Map to risk category via RiskEngine.
        6. Generate explainability (top features).
        7. Return PredictionResult.
        """
        start_time = time.perf_counter()
        
        try:
            # 1. Encode features
            encoded_dict = self.feature_encoder.encode(raw_features)
            
            # Maintain feature order based on dictionary keys (ideally this should match training exactly)
            # In production, we'd rely on a fixed feature list from metadata.json
            self._feature_names = list(encoded_dict.keys())
            feature_vector = np.array([list(encoded_dict.values())])
            
            # 2. Scale features
            scaler = self.model_manager.get_scaler()
            if scaler:
                # Some scalers expect 2D arrays
                scaled_vector = scaler.transform(feature_vector)
            else:
                scaled_vector = feature_vector
                
            # 3. Route to correct model
            model = self.model_manager.get_model(traffic_type)
            model_name = self.model_manager.get_model_name(traffic_type)
            
            # 4. Predict
            # Depending on the model, it might return class labels or probabilities. 
            # We assume predict_proba is available for confidence score calculation.
            if hasattr(model, "predict_proba"):
                probs = model.predict_proba(scaled_vector)[0]
                # Assuming binary classification: 0 = Benign, 1 = Anomaly
                anomaly_prob = probs[1] if len(probs) > 1 else probs[0]
                confidence = float(anomaly_prob * 100.0)
                verdict = bool(anomaly_prob >= 0.5)
            else:
                pred = model.predict(scaled_vector)[0]
                verdict = bool(pred)
                confidence = 100.0 if verdict else 0.0

            # 5. Risk calculation
            risk_category = self.risk_engine.calculate_risk(confidence, anomaly_baseline)
            
            # 6. Explainability
            explainability = self._generate_explainability(model, scaled_vector)
            
            # 7. Drift Tracking Hook
            self._track_model_drift_hook(scaled_vector, float(verdict))
            
            latency_ms = (time.perf_counter() - start_time) * 1000.0
            
            return PredictionResult(
                verdict=verdict,
                confidence=confidence,
                model_used=model_name,
                risk_category=risk_category,
                latency_ms=latency_ms,
                explainability_top_features=explainability
            )

        except Exception as e:
            logger.error(f"Prediction failed: {e}", exc_info=True)
            raise PredictionError(f"Inference failed: {str(e)}") from e

    def _generate_explainability(self, model: Any, processed_features: np.ndarray) -> List[Dict[str, float]]:
        """
        Generates SHAP values or falls back to feature importance mapping.
        Returns top 3 contributing features.
        """
        top_features = []
        try:
            if SHAP_AVAILABLE and hasattr(model, "predict_proba"):
                # Warning: TreeExplainer can be slow for real-time. 
                explainer = shap.TreeExplainer(model)
                shap_values = explainer.shap_values(processed_features)
                # For binary classification, shap_values might be a list of arrays [class_0, class_1]
                vals = shap_values[1][0] if isinstance(shap_values, list) else shap_values[0]
                
                # Pair with feature names
                feature_importances = list(zip(self._feature_names, vals))
                # Sort by absolute impact
                feature_importances.sort(key=lambda x: abs(x[1]), reverse=True)
                
                for name, imp in feature_importances[:3]:
                    top_features.append({"feature": name, "importance": float(imp)})
            elif hasattr(model, "feature_importances_"):
                # Fallback to global feature importance for the top features
                importances = model.feature_importances_
                feature_importances = list(zip(self._feature_names, importances))
                feature_importances.sort(key=lambda x: x[1], reverse=True)
                
                for name, imp in feature_importances[:3]:
                    top_features.append({"feature": name, "importance": float(imp)})
        except Exception as e:
            logger.warning(f"Failed to generate explainability: {e}")
            
        return top_features

    def _track_model_drift_hook(self, features: np.ndarray, prediction: float) -> None:
        """Minimal hook to log data distribution for future drift analysis."""
        # TODO: Implement drift tracking (e.g., streaming features to a Kafka topic or drift DB)
        pass
