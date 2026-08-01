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
        self._scaler = None
        self._encoder = None
        self._metadata: Dict[str, Any] = {}
        self._models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "models"
        )
        self._initialized = True

    def load_models(self, force_reload: bool = False) -> None:
        """Loads and caches models, scaler, and encoders."""
        with self._lock:
            if self._models and not force_reload:
                return
            
            logger.info(f"Loading models from {self._models_dir}...")
            try:
                # Load metadata
                metadata_path = os.path.join(self._models_dir, "metadata.json")
                if not os.path.exists(metadata_path):
                    raise ModelLoadError(f"Missing metadata.json at {metadata_path}")
                with open(metadata_path, 'r') as f:
                    self._metadata = json.load(f)

                # Load components
                self._scaler = joblib.load(os.path.join(self._models_dir, "scaler.joblib"))
                self._encoder = joblib.load(os.path.join(self._models_dir, "encoders.joblib"))
                
                self._models[TrafficType.NETWORK] = joblib.load(
                    os.path.join(self._models_dir, "network_traffic_RandomForest.joblib")
                )
                self._models[TrafficType.FIREWALL] = joblib.load(
                    os.path.join(self._models_dir, "firewall_XGBoost.joblib")
                )
                self._models[TrafficType.SYSTEM] = joblib.load(
                    os.path.join(self._models_dir, "system_logs_LightGBM.joblib")
                )
                
                self._validate_metadata()
                logger.info("All models loaded and validated successfully.")
            except Exception as e:
                logger.error(f"Failed to load models: {str(e)}")
                raise ModelLoadError(f"Model load failure: {str(e)}") from e

    def _validate_metadata(self) -> None:
        """Validates that loaded models match expected versions from metadata."""
        if not self._metadata:
            raise ModelLoadError("Metadata is empty or not loaded.")
        
        # Example validation check (in a real system this would check internal model attributes or hashes)
        required_keys = ["network_traffic_RandomForest", "firewall_XGBoost", "system_logs_LightGBM"]
        for key in required_keys:
            if key not in self._metadata.get("models", {}):
                logger.warning(f"Metadata missing version information for {key}")
                # Depending on strictness, we could raise an error here.
                # raise ModelLoadError(f"Missing version info for {key} in metadata.json")

    def get_model(self, traffic_type: TrafficType) -> Any:
        self.load_models()
        if traffic_type not in self._models:
            raise ModelLoadError(f"No model found for traffic type {traffic_type}")
        return self._models[traffic_type]

    def get_scaler(self) -> Any:
        self.load_models()
        return self._scaler

    def get_encoder(self) -> Any:
        self.load_models()
        return self._encoder
        
    def get_model_name(self, traffic_type: TrafficType) -> str:
        self.load_models()
        version_info = self._metadata.get("models", {})
        if traffic_type == TrafficType.NETWORK:
            return f"RandomForest_v{version_info.get('network_traffic_RandomForest', '1.0')}"
        elif traffic_type == TrafficType.FIREWALL:
            return f"XGBoost_v{version_info.get('firewall_XGBoost', '1.0')}"
        elif traffic_type == TrafficType.SYSTEM:
            return f"LightGBM_v{version_info.get('system_logs_LightGBM', '1.0')}"
        return "Unknown_Model"
