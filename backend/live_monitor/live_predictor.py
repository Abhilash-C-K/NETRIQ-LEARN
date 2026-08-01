import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.ai.predictor import Predictor
from backend.ai.contracts import TrafficType

class LivePredictor:
    """
    Step 4: Passes extracted numerical features to NetrIQ AI predictor and returns prediction, confidence, and threat level.
    """
    def __init__(self, dataset_name="cicids2017"):
        # Ported from backend/predictor.py on consolidation:
        # Centralized inference via the backend/ai/ module.
        self.dataset_name = dataset_name
        self._predictor = None  # Lazy-initialized on first predict() call

    def _get_predictor(self) -> Predictor:
        if self._predictor is None:
            self._predictor = Predictor()
        return self._predictor

    def predict(self, feature_dict: dict) -> dict:
        # Route to NETWORK model (replaces old dataset-specific router)
        result = self._get_predictor().predict(feature_dict, traffic_type=TrafficType.NETWORK)
        
        return {
            "dataset": self.dataset_name,
            "prediction": "ANOMALY" if result.verdict else "BENIGN",
            "confidence": round(result.confidence, 2),
            "threat_level": result.risk_category.value.upper(),
            "is_anomaly": result.verdict,
            "class_id": 1 if result.verdict else 0
        }
