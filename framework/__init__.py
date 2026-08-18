"""
NETRIQ Framework — AI-Powered Network Intrusion Detection & Automated Dual-Layer Response
"""

from backend.ai.contracts import (
    RiskCategory,
    Action,
    PredictionResult,
    Decision,
    TrafficType
)
from backend.ai.risk_engine import classify_risk, RiskEngine
from backend.ai.decision_engine import decide, DecisionEngine
from backend.ai.predictor import Predictor
from framework.engine import NetriqEngine

__version__ = "1.0.0"

__all__ = [
    "NetriqEngine",
    "Predictor",
    "RiskEngine",
    "DecisionEngine",
    "classify_risk",
    "decide",
    "RiskCategory",
    "Action",
    "PredictionResult",
    "Decision",
    "TrafficType"
]
