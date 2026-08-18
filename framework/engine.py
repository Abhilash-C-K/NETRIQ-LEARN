import time
from typing import Dict, Any, Optional, Tuple
from backend.ai.contracts import PredictionResult, FusedPredictionResult, Decision, TrafficType, Action
from backend.ai.predictor import Predictor
from backend.ai.anomaly_detector import AnomalyDetector
from backend.ai.fusion_engine import fuse
from backend.ai.risk_engine import classify_risk, RiskEngine
from backend.ai.decision_engine import decide
from backend.response.firewall import get_firewall_adapter
from backend.response.quarantine import QuarantineService
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class NetriqEngine:
    """
    High-level orchestrator for the NETRIQ Security Framework.
    Integrates Supervised ML (Random Forest/XGBoost/LightGBM), Unsupervised Anomaly Detection (Isolation Forest),
    Fusion Engine, Risk Engine, Decision Engine, and Two-Layer Response Drivers.
    """
    def __init__(self, block_threshold: float = 85.0):
        self.predictor = Predictor()
        self.anomaly_detector = AnomalyDetector()
        self.risk_engine = RiskEngine()
        self.firewall = get_firewall_adapter()
        self.quarantine = QuarantineService()
        self.block_threshold = block_threshold

    def evaluate_features(
        self,
        features: Dict[str, Any],
        traffic_type: TrafficType = TrafficType.NETWORK,
        is_internal: bool = False,
        anomaly_baseline: float = 0.0
    ) -> Tuple[PredictionResult, Decision]:
        """
        Parallel Data Flow:
        FeatureExtractor -> (a) Supervised Predictor + (b) Unsupervised AnomalyDetector
                         -> FusionEngine (fuse) -> Effective Confidence -> RiskEngine -> DecisionEngine
        """
        # 1a. Supervised Ensemble Inference
        sup_result = self.predictor.predict(
            raw_features=features,
            traffic_type=traffic_type,
            anomaly_baseline=anomaly_baseline
        )

        # 1b. Unsupervised Isolation Forest Anomaly Detection
        anomaly_score = self.anomaly_detector.predict(features)

        # 2. Fusion Engine: Merges supervised + unsupervised into single effective_confidence
        fused_result: FusedPredictionResult = fuse(sup_result, anomaly_score)

        # 3. Risk Engine: Classifies fused effective_confidence without modifying risk_engine
        fused_risk = classify_risk(fused_result.effective_confidence)

        # Update prediction result with fused risk & effective confidence
        fused_result.supervised_result.risk_category = fused_risk
        fused_result.supervised_result.confidence = fused_result.effective_confidence
        if fused_result.fusion_source == "unsupervised":
            fused_result.supervised_result.verdict = True

        # 4. Decision Engine Evaluation (Layer 1 Recommend / Layer 2 Quarantine)
        decision_obj = decide(
            risk=fused_risk,
            confidence=fused_result.effective_confidence,
            is_internal=is_internal
        )

        return fused_result.supervised_result, decision_obj

    async def evaluate_and_enforce(
        self,
        features: Dict[str, Any],
        target_ip: str,
        target_mac: Optional[str] = None,
        traffic_type: TrafficType = TrafficType.NETWORK,
        is_internal: bool = False,
        anomaly_baseline: float = 0.0
    ) -> Dict[str, Any]:
        """
        Evaluates features and executes enforcement action:
        - Layer 1: Calls external firewall adapter to RECOMMEND_BLOCK
        - Layer 2: Calls QuarantineService for direct internal device QUARANTINE
        """
        result, decision_obj = self.evaluate_features(
            features=features,
            traffic_type=traffic_type,
            is_internal=is_internal,
            anomaly_baseline=anomaly_baseline
        )

        action_success = False
        reason = decision_obj.reason

        if decision_obj.action == Action.RECOMMEND_BLOCK:
            logger.info(f"[NetriqEngine] Recommending Firewall Block for external host {target_ip}")
            action_success = await self.firewall.block_ip(target_ip, reason)
        elif decision_obj.action == Action.QUARANTINE:
            logger.warning(f"[NetriqEngine] Executing Direct Layer 2 Quarantine for internal host {target_ip}")
            action_success = await self.quarantine.quarantine_device(target_ip, target_mac, reason)
        else:
            logger.info(f"[NetriqEngine] Notification only for host {target_ip}")
            action_success = True

        return {
            "prediction": result,
            "decision": decision_obj,
            "target_ip": target_ip,
            "enforced": action_success,
            "timestamp": time.time()
        }
