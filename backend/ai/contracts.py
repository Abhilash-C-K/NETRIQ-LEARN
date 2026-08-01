from enum import Enum
from typing import List, Dict
from pydantic import BaseModel, Field

class TrafficType(str, Enum):
    NETWORK = "network"
    FIREWALL = "firewall"
    SYSTEM = "system"

class RiskCategory(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Action(str, Enum):
    NOTIFY = "notify"                  # Layer 1 action
    RECOMMEND_BLOCK = "recommend_block" # Layer 1 action
    QUARANTINE = "quarantine"           # Layer 2 action

class PredictionResult(BaseModel):
    """
    Structured output from predictor.py representing a single model inference result.
    """
    verdict: bool = Field(description="True if anomaly/malicious, False if benign")
    confidence: float = Field(description="Confidence score between 0.0 and 100.0")
    model_used: str = Field(description="Name/version of the model used")
    risk_category: RiskCategory = Field(description="Calculated risk category")
    latency_ms: float = Field(description="Inference latency in milliseconds")
    explainability_top_features: List[Dict[str, float]] = Field(
        default_factory=list,
        description="List of top contributing features: [{'feature': name, 'importance': float}]"
    )
