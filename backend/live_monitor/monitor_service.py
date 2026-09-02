"""
monitor_service.py
Async-compatible orchestrator for the live packet capture pipeline.
Wraps PacketSniffer → FlowBuilder → FeatureExtractor → LivePredictor in a background asyncio task.
"""

import asyncio
from backend.utils.logger import get_logger
from backend.live_monitor.packet_sniffer import PacketSniffer
from backend.live_monitor.flow_builder import FlowBuilder
from backend.live_monitor.feature_extractor import FeatureExtractor
from backend.live_monitor.live_predictor import LivePredictor

from typing import Dict, Any
from backend.live_monitor.heuristic_fallback import HeuristicFallback
from backend.ai.risk_engine import classify_risk
from backend.ai.decision_engine import decide
from backend.ai.contracts import PredictionResult, Action
from backend.response.response_engine import ResponseEngine
from backend.utils.validators import is_internal_ip

logger = get_logger(__name__)


class MonitorService:
    """
    Manages the lifecycle of the live packet capture pipeline.
    start() launches an asyncio background task; stop() signals it to shut down.
    """

    def __init__(self, dataset_name: str = "cicids2017", interface: str = None):
        self.dataset_name = dataset_name
        self.interface = interface
        self._task: asyncio.Task = None
        self._stop_event = asyncio.Event()
        self._loop: asyncio.AbstractEventLoop = None
        self.heuristic_fallback = HeuristicFallback()
        self.response_engine = ResponseEngine()
        self.sniffer = PacketSniffer(
            interface=interface,
            heuristic_callback=self._handle_malformed_heuristic
        )
        self.flow_builder = FlowBuilder(idle_timeout_sec=3.0)
        self.predictor = LivePredictor(dataset_name=dataset_name)

    def _handle_malformed_heuristic(self, partial_pkt: Dict[str, Any]) -> None:
        """Callback invoked by PacketSniffer on Case B malformed IP packets."""
        try:
            verdict = self.heuristic_fallback.evaluate(partial_pkt)
            if verdict.escalate:
                logger.warning(
                    f"[HEURISTIC_FALLBACK][CASE_B] Malformed packet from {partial_pkt.get('src_ip')} "
                    f"escalated to confidence_floor={verdict.confidence_floor:.1f}% "
                    f"via rules: {verdict.matched_rules}"
                )

                # 1. Classify Risk Category
                risk_cat = classify_risk(verdict.confidence_floor)

                # 2. Determine Internal vs External Asset Scope
                src_ip = partial_pkt.get("src_ip", "")
                dst_ip = partial_pkt.get("dst_ip", "")
                is_internal = is_internal_ip(src_ip) or is_internal_ip(dst_ip)

                # 3. Formulate Decision (respecting single-rule vs 2-rule Layer 2 ceilings)
                decision = decide(risk=risk_cat, confidence=verdict.confidence_floor, is_internal=is_internal)

                # 3b. Enforce Escalation Ceiling Guard for Heuristic-only matches:
                # Heuristic matches CANNOT trigger Layer 2 QUARANTINE unless is_internal=True
                # AND at least HEURISTIC_MIN_RULES_FOR_QUARANTINE rules matched.
                if decision.action == Action.QUARANTINE:
                    import backend.config.config as config
                    matched_count = len(verdict.matched_rules)
                    min_rules = getattr(config, "HEURISTIC_MIN_RULES_FOR_QUARANTINE", 2)
                    if not (is_internal and matched_count >= min_rules):
                        logger.warning(
                            f"[MonitorService][HEURISTIC_FALLBACK] QUARANTINE ceiling enforced! "
                            f"Downgrading decision to RECOMMEND_BLOCK (matched {matched_count}/{min_rules} rules required for internal QUARANTINE)."
                        )
                        decision.action = Action.RECOMMEND_BLOCK
                        decision.reason += " (Heuristic escalation ceiling enforced: capped at RECOMMEND_BLOCK)"

                # 4. Dispatch Enforcement Action via ResponseEngine
                synthetic_prediction = PredictionResult(
                    verdict=True,
                    confidence=verdict.confidence_floor,
                    model_used="HeuristicFallback_CaseB",
                    risk_category=risk_cat,
                    latency_ms=0.0,
                    explainability_top_features=[]
                )

                context = {
                    "src_ip": src_ip,
                    "dst_ip": dst_ip,
                    "src_port": partial_pkt.get("src_port", 0),
                    "dst_port": partial_pkt.get("dst_port", 0),
                    "protocol": partial_pkt.get("protocol", "MALFORMED"),
                    "reason": decision.reason,
                    "matched_rules": verdict.matched_rules
                }

                # Schedule enforcement asynchronously on the main loop
                coro = self.response_engine.handle_verdict(synthetic_prediction, decision.action, context)
                if self._loop and self._loop.is_running():
                    asyncio.run_coroutine_threadsafe(coro, self._loop)
                else:
                    try:
                        loop = asyncio.get_running_loop()
                        loop.create_task(coro)
                    except RuntimeError:
                        pass
        except Exception as e:
            logger.error(f"[MonitorService] Error in malformed packet heuristic handling: {e}", exc_info=True)

    async def start(self):
        """Starts the pipeline as a background asyncio task. Idempotent."""
        if self._task and not self._task.done():
            logger.info("[MonitorService] Pipeline already running.")
            return

        self._stop_event.clear()
        self.sniffer.start()
        self._task = asyncio.create_task(self._run_loop(), name="live_monitor_pipeline")
        logger.info(f"[MonitorService] Pipeline started (dataset={self.dataset_name}, interface={self.interface or 'default'}).")

    async def stop(self):
        """Signals the pipeline loop to stop and waits for clean shutdown."""
        if not self._task or self._task.done():
            logger.info("[MonitorService] Pipeline already stopped.")
            return

        self._stop_event.set()
        self.sniffer.stop()
        try:
            await asyncio.wait_for(self._task, timeout=5.0)
        except asyncio.TimeoutError:
            logger.warning("[MonitorService] Pipeline did not stop within timeout; cancelling task.")
            self._task.cancel()
        logger.info("[MonitorService] Pipeline stopped.")

    async def _run_loop(self):
        """
        Core pipeline loop: dequeues packets (non-blocking via asyncio.sleep),
        builds flows, extracts features, calls the AI predictor, and routes results
        to ResponseEngine, MongoDB, and WebSocket clients.
        """
        from backend.ai.contracts import RiskCategory, Action
        from backend.database.collections import threats_repo
        from backend.websocket.broadcaster import broadcaster
        from backend.websocket.events import LiveVerdictEvent

        loop = asyncio.get_event_loop()
        self._loop = loop
        logger.info("[MonitorService] Capture loop active.")

        while not self._stop_event.is_set():
            # Offload blocking queue.get to executor to stay async-safe
            pkt = await loop.run_in_executor(None, self._get_packet_blocking)

            if pkt is None:
                # No packet available; yield control to other coroutines
                await asyncio.sleep(0.01)
                continue

            completed_flows = self.flow_builder.process_packet(pkt)
            for flow in completed_flows:
                try:
                    features = FeatureExtractor.extract_features(flow)
                    result_dict = self.predictor.predict(features)
                    
                    # 1. Scope & Decision Formulation
                    src_ip = getattr(flow, 'src_ip', '')
                    dst_ip = getattr(flow, 'dst_ip', '')
                    is_internal = is_internal_ip(src_ip) or is_internal_ip(dst_ip)
                    
                    threat_level_name = result_dict.get("threat_level", "LOW")
                    risk_cat = getattr(RiskCategory, threat_level_name, RiskCategory.LOW)
                    confidence = result_dict.get("confidence", 0.0)
                    is_anomaly = result_dict.get("is_anomaly", False)
                    
                    decision = decide(risk=risk_cat, confidence=confidence, is_internal=is_internal)
                    
                    logger.debug(
                        f"[MonitorService] Flow {src_ip}:{flow.src_port} -> "
                        f"{dst_ip}:{flow.dst_port} | "
                        f"verdict={'ANOMALY' if is_anomaly else 'BENIGN'} "
                        f"confidence={confidence}% | action={decision.action.value}"
                    )

                    prediction_obj = PredictionResult(
                        verdict=is_anomaly,
                        confidence=confidence,
                        model_used=self.dataset_name,
                        risk_category=risk_cat,
                        latency_ms=0.0,
                        explainability_top_features=[]
                    )

                    context = {
                        "src_ip": src_ip,
                        "dst_ip": dst_ip,
                        "src_port": getattr(flow, 'src_port', 0),
                        "dst_port": getattr(flow, 'dst_port', 0),
                        "protocol": getattr(flow, 'protocol', 'IP'),
                        "sni": getattr(flow, 'sni', None),
                        "reason": decision.reason
                    }

                    # 2. Dispatch to ResponseEngine if actionable
                    if decision.action != Action.NOTIFY:
                        coro = self.response_engine.handle_verdict(prediction_obj, decision.action, context)
                        try:
                            loop.create_task(coro)
                        except RuntimeError:
                            pass

                    # 3. Persist to MongoDB threats collection
                    threat_record = {
                        "timestamp": getattr(flow, 'last_time', 0.0),
                        "src_ip": src_ip,
                        "dst_ip": dst_ip,
                        "src_port": getattr(flow, 'src_port', 0),
                        "dst_port": getattr(flow, 'dst_port', 0),
                        "protocol": getattr(flow, 'protocol', 'IP'),
                        "sni": getattr(flow, 'sni', None),
                        "prediction": result_dict.get("prediction", "BENIGN"),
                        "confidence": confidence,
                        "severity": risk_cat.value,
                        "action": decision.action.value,
                        "is_anomaly": is_anomaly,
                        "is_internal": is_internal,
                    }
                    try:
                        loop.create_task(threats_repo.create(threat_record))
                    except RuntimeError:
                        pass

                    # 4. Broadcast live verdict to connected WebSocket clients
                    event = LiveVerdictEvent(payload=threat_record)
                    asyncio.create_task(broadcaster.publish(event))

                except Exception as e:
                    logger.error(f"[MonitorService] Error processing flow: {e}", exc_info=True)

        logger.info("[MonitorService] Capture loop exited cleanly.")

    def _get_packet_blocking(self):
        """Thin blocking wrapper around the sniffer queue (runs in executor)."""
        return self.sniffer.get_packet(timeout=0.5)


# Singleton instance
monitor_service = MonitorService()
