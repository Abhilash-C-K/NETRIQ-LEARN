import os
import sys

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.predictor import get_predictor

class LivePredictor:
    """
    Step 4: Passes extracted numerical features to NetrIQ model manager and returns prediction, confidence, and threat level.
    """
    def __init__(self, dataset_name="cicids2017"):
        self.dataset_name = dataset_name
        self.predictor = get_predictor(dataset_name)

    def predict(self, feature_dict: dict) -> dict:
        result = self.predictor.predict_flow(feature_dict)
        return {
            "dataset": self.dataset_name,
            "prediction": result["prediction"],
            "confidence": round(result["confidence"] * 100, 2),
            "threat_level": result["threat_level"],
            "is_anomaly": result["is_anomaly"],
            "class_id": result["class_id"]
        }
