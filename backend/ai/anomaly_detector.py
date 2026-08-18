import os
import json
import threading
import joblib
import numpy as np
from typing import Dict, Any
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Canonical feature list: must exactly match FeatureExtractor.extract_features() output keys and order.
# Training and inference both use this list — no padding or truncation is performed at runtime.
# If FeatureExtractor adds/removes features, retrain the IsolationForest and update this list together.
EXPECTED_FEATURE_NAMES = [
    'Flow Duration', 'Total Fwd Packets', 'Total Backward Packets', 'Total Length of Fwd Packets',
    'Total Length of Bwd Packets', 'Fwd Packet Length Max', 'Fwd Packet Length Min', 'Fwd Packet Length Mean',
    'Fwd Packet Length Std', 'Bwd Packet Length Max', 'Bwd Packet Length Min', 'Bwd Packet Length Mean',
    'Bwd Packet Length Std', 'Flow Bytes/s', 'Flow Packets/s', 'Flow IAT Mean', 'Flow IAT Std',
    'Flow IAT Max', 'Flow IAT Min', 'Fwd IAT Total', 'Fwd IAT Mean', 'Fwd IAT Std', 'Fwd IAT Max',
    'Fwd IAT Min', 'Bwd IAT Total', 'Bwd IAT Mean', 'Bwd IAT Std', 'Bwd IAT Max', 'Bwd IAT Min',
    'Fwd PSH Flags', 'Bwd PSH Flags', 'Fwd URG Flags', 'Bwd URG Flags', 'Fwd Header Length',
    'Bwd Header Length', 'Fwd Packets/s', 'Bwd Packets/s', 'Min Packet Length', 'Max Packet Length',
    'Packet Length Mean', 'Packet Length Std', 'Packet Length Variance', 'FIN Flag Count', 'SYN Flag Count',
    'RST Flag Count', 'PSH Flag Count', 'ACK Flag Count', 'URG Flag Count', 'CWR Flag Count',
    'ECE Flag Count', 'Down/Up Ratio', 'Average Packet Size', 'Avg Fwd Segment Size', 'Avg Bwd Segment Size',
    'Fwd Header Length.1', 'Subflow Fwd Packets', 'Subflow Fwd Bytes', 'Subflow Bwd Packets',
    'Subflow Bwd Bytes', 'Init_Win_bytes_forward', 'Init_Win_bytes_backward', 'act_data_pkt_fwd',
    'min_seg_size_forward', 'Active Mean', 'Active Std', 'Active Max', 'Active Min', 'Idle Mean',
    'Idle Std', 'Idle Max', 'Idle Min'
]

class AnomalyDetector:
    """
    Inference-only Unsupervised Anomaly Detector using Isolation Forest.
    Strictly handles model loading and prediction:
    Zero packet capture, zero flow building, zero decision logic.

    Feature schema contract: trained on exactly len(EXPECTED_FEATURE_NAMES) features
    (currently 71 CICIDS2017 columns). FeatureExtractor must produce the same schema.
    No runtime padding or truncation is applied — a schema mismatch is logged and the
    fail-safe score of 0.0 is returned (equivalent to ANOMALY_DETECTOR_ENABLED=False behavior).

    Fail-safe behavior:
        - Model artifact absent at load time  -> score=0.0, WARNING logged with "[ABSENT]" tag.
        - Inference exception at predict time -> score=0.0, WARNING logged with "[EXCEPTION]" tag.
    Both produce the same effective behavior as ANOMALY_DETECTOR_ENABLED=False (supervised-only
    pass-through via fuse()), but are distinguishable in logs by the presence of these tags.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(AnomalyDetector, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._model = None
        self._calib_min: float = -0.5
        self._calib_max: float = 0.5
        self._models_dir = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            "models"
        )
        self._load_model()
        self._initialized = True

    def _load_model(self) -> None:
        """Loads Isolation Forest artifact and calibration parameters from models directory."""
        try:
            model_path = os.path.join(self._models_dir, "network_traffic_IsolationForest.joblib")
            metadata_path = os.path.join(self._models_dir, "metadata.json")

            if not os.path.exists(model_path):
                # [ABSENT]: Operationally distinct from inference failure. Check artifact pipeline.
                logger.warning(
                    f"[AnomalyDetector][ABSENT] Model artifact not found at {model_path}. "
                    f"Detector disabled — scores will be 0.0 (supervised-only fallback). "
                    f"Run scripts/train_anomaly_detector.py to generate the artifact."
                )
                return

            self._model = joblib.load(model_path)
            logger.info(f"[AnomalyDetector] Isolation Forest loaded successfully from {model_path}")

            # Schema consistency check: warn loudly if trained shape doesn't match expected
            trained_n = getattr(self._model, "n_features_in_", None)
            expected_n = len(EXPECTED_FEATURE_NAMES)
            if trained_n is not None and trained_n != expected_n:
                logger.warning(
                    f"[AnomalyDetector][SCHEMA_MISMATCH] Model trained on {trained_n} features, "
                    f"but EXPECTED_FEATURE_NAMES has {expected_n}. "
                    f"Retrain with scripts/train_anomaly_detector.py before deploying."
                )

            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    meta = json.load(f)
                    calib = meta.get("calibration", {}).get("isolation_forest", {})
                    self._calib_min = float(calib.get("min_score", -0.5))
                    self._calib_max = float(calib.get("max_score", 0.5))
            else:
                logger.warning(f"[AnomalyDetector] Metadata absent at {metadata_path}. Using default calibration range.")
        except Exception as e:
            logger.warning(f"[AnomalyDetector][ABSENT] Model load failed ({str(e)}). Detector disabled — scores will be 0.0.")
            self._model = None

    def predict(self, features: Dict[str, Any]) -> float:
        """
        Processes feature vector and returns a normalized 0.0 to 100.0 anomaly score.

        Feature vector is extracted from the dict using EXPECTED_FEATURE_NAMES key order —
        no padding or truncation. If a key is missing it contributes 0.0.

        Min-max normalization formula:
            raw_score = -decision_function(X)[0]   (higher means more anomalous)
            normalized = ((raw_score - calib_min) / (calib_max - calib_min)) * 100.0
            clamped to [0.0, 100.0]

        Returns 0.0 on any failure (fail-safe direction: "definitely normal").
        This is operationally equivalent to ANOMALY_DETECTOR_ENABLED=False — check
        logs for [ABSENT] or [EXCEPTION] tags to distinguish a failure from a toggle.
        """
        if self._model is None:
            # Model was not loaded — [ABSENT] already logged at load time, no duplicate log here.
            return 0.0

        try:
            # Extract values in canonical EXPECTED_FEATURE_NAMES order.
            # FeatureExtractor always emits all 71 keys (stat_summary returns 0.0 for empty lists,
            # so even single-packet flows produce complete output). Missing keys are therefore not
            # expected from the live pipeline — they indicate a partial dict from a manual caller
            # or a future FeatureExtractor schema change. Logged at DEBUG level (not WARNING) since
            # this is a non-critical fallback; 0.0 is the correct statistical default for absent features.
            missing = [k for k in EXPECTED_FEATURE_NAMES if k not in features]
            if missing:
                logger.debug(
                    f"[AnomalyDetector][MISSING_FEATURE] {len(missing)} feature(s) absent from input dict, "
                    f"defaulting to 0.0: {missing}. Expected from manual callers only — "
                    f"FeatureExtractor always emits all {len(EXPECTED_FEATURE_NAMES)} keys."
                )
            numeric_features = [float(features.get(k, 0.0)) for k in EXPECTED_FEATURE_NAMES]

            X = np.array([numeric_features])

            # Scikit-learn's decision_function returns negative values for anomalies and positive for inliers.
            # Inverting sign so higher value = higher anomaly severity.
            raw_score = float(-self._model.decision_function(X)[0])

            # Min-Max Normalization against calibration set bounds
            denom = self._calib_max - self._calib_min
            if abs(denom) < 1e-6:
                norm_score = 50.0
            else:
                norm_score = ((raw_score - self._calib_min) / denom) * 100.0

            # Clamp output strictly between 0.0 and 100.0 to prevent underflow/overflow
            return max(0.0, min(100.0, norm_score))

        except Exception as e:
            # [EXCEPTION]: Operationally distinct from [ABSENT]. Model loaded but inference failed.
            # Attempt deterministic Heuristic Fallback evaluation before returning 0.0 default.
            try:
                from backend.live_monitor.heuristic_fallback import HeuristicFallback
                heuristic_verdict = HeuristicFallback().evaluate(features)
                if heuristic_verdict.escalate:
                    logger.warning(
                        f"[AnomalyDetector][EXCEPTION][HEURISTIC_FALLBACK] Inference failed ({str(e)}), "
                        f"but HeuristicFallback escalated to confidence_floor={heuristic_verdict.confidence_floor:.1f}% "
                        f"via rules: {heuristic_verdict.matched_rules}"
                    )
                    return heuristic_verdict.confidence_floor
            except Exception as h_err:
                logger.debug(f"[AnomalyDetector] Heuristic fallback evaluation failed safely: {h_err}")

            logger.warning(f"[AnomalyDetector][EXCEPTION] Inference failed ({str(e)}). Falling back to 0.0.")
            return 0.0

