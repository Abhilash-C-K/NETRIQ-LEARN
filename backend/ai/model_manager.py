import os
import json
import threading
import joblib
from typing import Any, Dict, Optional
from backend.ai.contracts import TrafficType
from backend.utils.logger import get_logger
from backend.utils.exceptions import ModelLoadError

logger = get_logger(__name__)

class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ModelManager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._models: Dict[TrafficType, Any] = {}
        self._metadata: Dict[TrafficType, Dict[str, Any]] = {}
        self._system_vectorizer = None
        self._models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "models"
        )
        self._initialized = True

    def load_models(self, force_reload: bool = False) -> None:
        """Loads each specialist model with its OWN metadata file (per-traffic-type schema)."""
        with self._lock:
            if self._models and not force_reload:
                return

            env = os.getenv("ENVIRONMENT", os.getenv("ENV", "development")).lower()
            logger.info(f"Loading models from {self._models_dir}...")

            model_files = {
                TrafficType.NETWORK: ("network_traffic_RandomForest.joblib", "network_metadata.json"),
                TrafficType.FIREWALL: ("firewall_XGBoost.joblib", "firewall_metadata.json"),
                TrafficType.SYSTEM: ("system_logs_LightGBM.joblib", "system_metadata.json"),
            }

            try:
                for traffic_type, (model_file, meta_file) in model_files.items():
                    model_path = os.path.join(self._models_dir, model_file)
                    meta_path = os.path.join(self._models_dir, meta_file)

                    if not (os.path.exists(model_path) and os.path.exists(meta_path)):
                        raise FileNotFoundError(f"Missing {model_file} or {meta_file}")

                    self._models[traffic_type] = joblib.load(model_path)
                    with open(meta_path, 'r') as f:
                        self._metadata[traffic_type] = json.load(f)

                # Optional artifacts if present
                scaler_path = os.path.join(self._models_dir, "scaler.joblib")
                if os.path.exists(scaler_path):
                    self._scaler = joblib.load(scaler_path)

                encoder_path = os.path.join(self._models_dir, "encoders.joblib")
                if os.path.exists(encoder_path):
                    self._encoder = joblib.load(encoder_path)

                # System traffic vectorizer
                vec_path = os.path.join(self._models_dir, "system_logs_vectorizer.joblib")
                if os.path.exists(vec_path):
                    self._system_vectorizer = joblib.load(vec_path)
                    self._vectorizer = self._system_vectorizer

                logger.info("All models, per-model metadata, and vectorizers loaded successfully.")

            except Exception as e:
                if env == "production":
                    logger.error(f"[FATAL_MODEL_LOAD_ERROR] Could not load models in production mode: {e}")
                    raise ModelLoadError(f"FATAL MODEL LOAD ERROR: {e}") from e
                logger.warning(f"Could not load real models ({e}). Using fallback mock models.")
                self._init_fallback_models()

    def _init_fallback_models(self) -> None:
        class MockClassifier:
            def __init__(self, proba=0.9):
                self._proba = proba
            def predict_proba(self, X):
                return [[1.0 - self._proba, self._proba]]
            def predict(self, X):
                return [1 if self._proba >= 0.5 else 0]

        class MockVectorizer:
            def __init__(self):
                self.vocabulary_ = {"4624": 0, "4625": 1, "4672": 2, "4688": 3, "7045": 4, "1102": 5}
            def transform(self, raw_documents):
                import scipy.sparse as sp
                doc = raw_documents[0] if raw_documents else ""
                tokens = doc.split()
                counts = [tokens.count(k) for k in self.vocabulary_]
                return sp.csr_matrix([counts], dtype=float)

        from backend.ai.anomaly_detector import EXPECTED_FEATURE_NAMES
        firewall_features = [
            "Source Port", "Destination Port", "NAT Source Port", "NAT Destination Port",
            "Bytes", "Bytes Sent", "Bytes Received", "Packets", "Elapsed Time (sec)",
            "pkts_sent", "pkts_received"
        ]

        self._models[TrafficType.NETWORK] = MockClassifier(0.85)
        self._models[TrafficType.FIREWALL] = MockClassifier(0.75)
        self._models[TrafficType.SYSTEM] = MockClassifier(0.90)

        self._metadata[TrafficType.NETWORK] = {"features": EXPECTED_FEATURE_NAMES, "threshold": 0.5, "dataset": "MOCK_CICIDS2017"}
        self._metadata[TrafficType.FIREWALL] = {"features": firewall_features, "threshold": 0.5, "dataset": "MOCK_FIREWALL"}
        self._metadata[TrafficType.SYSTEM] = {"features": ["event_sequence"], "threshold": 0.5, "dataset": "MOCK_SYSTEM"}
        self._system_vectorizer = MockVectorizer()

    def get_model(self, traffic_type: TrafficType) -> Any:
        self.load_models()
        if traffic_type not in self._models:
            raise ModelLoadError(f"No model found for traffic type {traffic_type}")
        return self._models[traffic_type]

    def get_feature_names(self, traffic_type: TrafficType) -> list:
        """Returns the exact ordered feature list this model was trained on."""
        self.load_models()
        return self._metadata.get(traffic_type, {}).get("features", [])

    def get_threshold(self, traffic_type: TrafficType) -> float:
        """Returns this model's own calibrated decision threshold (NOT a universal 0.5)."""
        self.load_models()
        if traffic_type in self._metadata and isinstance(self._metadata[traffic_type], dict):
            return self._metadata[traffic_type].get("threshold", 0.5)
        thresholds = self._metadata.get("thresholds", {})
        return float(thresholds.get(traffic_type.value, 0.5))

    def get_scaler(self) -> Any:
        self.load_models()
        return getattr(self, "_scaler", None)

    def get_encoder(self) -> Any:
        self.load_models()
        return getattr(self, "_encoder", None)

    def get_vectorizer(self) -> Any:
        self.load_models()
        return getattr(self, "_vectorizer", None)

    def get_metadata(self) -> Dict[str, Any]:
        self.load_models()
        return self._metadata

    def get_system_vectorizer(self) -> Any:
        self.load_models()
        return getattr(self, "_system_vectorizer", None)

    def get_model_name(self, traffic_type: TrafficType) -> str:
        self.load_models()
        dataset = self._metadata.get(traffic_type, {}).get("dataset", "unknown")
        names = {
            TrafficType.NETWORK: "RandomForest",
            TrafficType.FIREWALL: "XGBoost",
            TrafficType.SYSTEM: "LightGBM",
        }
        return f"{names.get(traffic_type, 'Unknown')}[{dataset}]"
        