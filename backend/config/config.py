import os

"""
Application Configuration & Unsupervised Fusion Thresholds
"""

RISK_THRESHOLDS = {
    "LOW_MAX": float(os.getenv("RISK_LOW_MAX", "40.0")),
    "MEDIUM_MAX": float(os.getenv("RISK_MEDIUM_MAX", "70.0")),
    "HIGH_MAX": float(os.getenv("RISK_HIGH_MAX", "90.0")),
    # > HIGH_MAX (90.0%) is CRITICAL
}

# Actionable enforcement threshold: effective confidence > MEDIUM_MAX (70.0%)
ACTIONABLE_RISK_THRESHOLD = RISK_THRESHOLDS["MEDIUM_MAX"]

# Unsupervised Zero-Day Detection & Fusion Configuration
ANOMALY_DETECTOR_ENABLED = os.getenv("ANOMALY_DETECTOR_ENABLED", "True").lower() in ("true", "1", "yes")

_zero_day_weight_raw = float(os.getenv("ZERO_DAY_WEIGHT", "0.8"))
if not (0.0 <= _zero_day_weight_raw <= 1.0):
    raise ValueError(f"ZERO_DAY_WEIGHT must be bounded between 0.0 and 1.0. Got: {_zero_day_weight_raw}")
ZERO_DAY_WEIGHT = _zero_day_weight_raw

# Minimum Isolation Forest anomaly score (0-100 normalized) to classify a flow as HIGH anomaly.
# Default 70.0 is intentionally aligned with RISK_THRESHOLDS["MEDIUM_MAX"] so that the anomaly
# detector and the risk engine share a consistent "actionable" boundary: only flows the
# IsolationForest rates above the MEDIUM/HIGH boundary trigger fusion escalation.
# This is a deliberate design choice, not a coincidental re-use of the number — both thresholds
# represent the same semantic boundary: "above MEDIUM, action required."
# If calibration data shifts this boundary (e.g. the 99th-percentile benign score rises above 70.0),
# adjust via RISK_MEDIUM_MAX env var which updates both MEDIUM_MAX and this threshold together.
HIGH_ANOMALY_THRESHOLD = float(os.getenv("HIGH_ANOMALY_THRESHOLD", "70.0"))

# Deterministic Heuristic Fallback Tier Configuration
HEURISTIC_CONFIDENCE_FLOOR = float(os.getenv("HEURISTIC_CONFIDENCE_FLOOR", "75.0"))
HEURISTIC_PACKET_RATE_THRESHOLD = float(os.getenv("HEURISTIC_PACKET_RATE_THRESHOLD", "1000.0"))
HEURISTIC_SUSTAINED_DURATION_SEC = float(os.getenv("HEURISTIC_SUSTAINED_DURATION_SEC", "2.0"))
HEURISTIC_MICRO_PACKET_RATE_THRESHOLD = float(os.getenv("HEURISTIC_MICRO_PACKET_RATE_THRESHOLD", "100.0"))
HEURISTIC_SENSITIVE_PORTS = [
    int(p.strip()) for p in os.getenv("HEURISTIC_SENSITIVE_PORTS", "22,88,3389,3306,5432,5985").split(",") if p.strip()
]
HEURISTIC_MIN_RULES_FOR_QUARANTINE = int(os.getenv("HEURISTIC_MIN_RULES_FOR_QUARANTINE", "2"))


