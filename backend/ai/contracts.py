from enum import Enum
from typing import List, Dict, Any, Literal, Optional
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

class FusedPredictionResult(BaseModel):
    """
    Structured output from fusion_engine.py representing fused prediction results.
    """
    supervised_result: PredictionResult = Field(description="Original prediction result from supervised ensemble")
    anomaly_score: float = Field(description="Normalized 0.0-100.0 anomaly score from Isolation Forest")
    fusion_source: Literal["supervised", "unsupervised", "agreement"] = Field(description="Source rule that governed effective_confidence")
    effective_confidence: float = Field(description="Fused effective confidence score (0.0 to 100.0) passed to RiskEngine")

class Decision(BaseModel):
    """
    Structured output from decision_engine.py representing an enforcement decision.
    """
    action: Action = Field(description="Action to execute: NOTIFY, RECOMMEND_BLOCK, or QUARANTINE")
    target_layer: str = Field(description="Target layer: Layer 1 (External) or Layer 2 (Internal)")
    reason: str = Field(description="Human-readable decision justification")
    timestamp: float = Field(description="Unix timestamp of decision execution")

# ---------------------------------------------------------------------------
# Explainability Contracts
# ---------------------------------------------------------------------------

class FeatureContribution(BaseModel):
    """Single feature's signed contribution to a threat verdict."""
    name: str = Field(description="Feature name (from EXPECTED_FEATURE_NAMES)")
    value: Optional[float] = Field(default=None, description="Raw observed feature value")
    contribution: float = Field(description="Signed SHAP value or signed z-score deviation")
    direction: Literal["increases_risk", "decreases_risk"] = Field(
        description="Risk direction: positive contribution increases risk, negative decreases it"
    )

class ExplanationResult(BaseModel):
    """
    Per-prediction explainability output.
    - explanation_source='shap': SHAP TreeExplainer was used (fusion_source in supervised/agreement).
    - explanation_source='deviation': z-score deviation was used (fusion_source == unsupervised).
    Both sources produce structurally identical top_features lists for uniform frontend consumption.
    """
    prediction_id: str = Field(description="ID of the explained prediction")
    explanation_source: Literal["shap", "deviation"] = Field(description="Explainability method used")
    top_features: List[FeatureContribution] = Field(description="Top-N features ranked by abs(contribution)")
    base_value: float = Field(description="SHAP base value (expected model output) or benign mean confidence")
    generated_at: float = Field(description="Unix timestamp of explanation generation")

class PredictionRecord(BaseModel):
    """
    Persisted record stored in the 'predictions' MongoDB collection at prediction time.
    Enables lazy/on-demand explanation without re-running full inference.

    DATA RETENTION NOTE: raw_features contains 71 network flow statistics that may include
    implicit src/dst IP-derived metrics. Review data retention and anonymisation policy before
    enabling long-term storage in production. Acceptable for prototype/demo environments.
    """
    id: Optional[str] = Field(default=None, description="MongoDB ObjectId as string")
    raw_features: Dict[str, Any] = Field(description="71-feature dict from FeatureExtractor")
    fusion_source: Literal["supervised", "unsupervised", "agreement"] = Field(description="Fusion source from FusedPredictionResult")
    model_used: str = Field(description="Model that produced the supervised result")
    effective_confidence: float = Field(description="Fused effective confidence at decision time")
    anomaly_score: float = Field(description="Isolation Forest anomaly score at decision time")
    created_at: float = Field(description="Unix timestamp of original prediction")

class HeuristicVerdict(BaseModel):
    """
    Output contract for the deterministic Heuristic Fallback Tier.
    Evaluated when FeatureExtractor or AI model inference raises an [EXCEPTION].
    Provides a deterministic safety-net confidence floor without pretending to be ML.
    """
    matched_rules: List[str] = Field(default_factory=list, description="List of heuristic rule names triggered")
    escalate: bool = Field(default=False, description="True if any rule matched and escalation is warranted")
    confidence_floor: float = Field(default=0.0, description="Fallback confidence floor (e.g. 75.0% if escalated, 0.0 otherwise)")
    reason: str = Field(default="No heuristic rules matched", description="Human-readable decision justification")
    timestamp: float = Field(description="Unix timestamp of heuristic evaluation")

