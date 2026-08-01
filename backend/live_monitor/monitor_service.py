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
        self.sniffer = PacketSniffer(interface=interface)
        self.flow_builder = FlowBuilder(idle_timeout_sec=3.0)
        self.predictor = LivePredictor(dataset_name=dataset_name)

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
        builds flows, extracts features, and calls the AI predictor.
        """
        loop = asyncio.get_event_loop()
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
                    result = self.predictor.predict(features)
                    logger.debug(
                        f"[MonitorService] Flow {flow.src_ip}:{flow.src_port} -> "
                        f"{flow.dst_ip}:{flow.dst_port} | "
                        f"verdict={'ANOMALY' if result['is_anomaly'] else 'BENIGN'} "
                        f"confidence={result['confidence']}%"
                    )
                    # TODO: route result to response_engine and database
                except Exception as e:
                    logger.error(f"[MonitorService] Error processing flow: {e}", exc_info=True)

        logger.info("[MonitorService] Capture loop exited cleanly.")

    def _get_packet_blocking(self):
        """Thin blocking wrapper around the sniffer queue (runs in executor)."""
        return self.sniffer.get_packet(timeout=0.5)


# Singleton instance
monitor_service = MonitorService()
