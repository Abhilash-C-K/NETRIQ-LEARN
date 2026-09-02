import asyncio
import time
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.websocket.broadcaster import broadcaster
from backend.websocket.events import MonitorStatusEvent
from backend.live_monitor.monitor_service import monitor_service as live_monitor

logger = get_logger(__name__)


class MonitoringService:
    def __init__(self):
        self._is_running = False
        self._start_time: float = 0.0
        self._lock: asyncio.Lock | None = None

    @property
    def lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def get_status(self) -> Dict[str, Any]:
        """Returns current monitoring status as a dictionary with operational telemetry counters."""
        uptime = (time.time() - self._start_time) if self._is_running else 0.0
        
        # Pull live operational metrics from PacketSniffer instance
        sniffer = getattr(live_monitor, "sniffer", None)
        queue_drop_count = getattr(sniffer, "queue_drop_count", 0) if sniffer else 0
        non_ip_count = getattr(sniffer, "non_ip_count", 0) if sniffer else 0
        malformed_ip_count = getattr(sniffer, "malformed_ip_count", 0) if sniffer else 0
        
        interface = getattr(live_monitor, "interface", None)
        
        return {
            "is_running": self._is_running,
            "mode": "active" if self._is_running else "stopped",
            "interface": interface or "Default (Auto-select)",
            "uptime_seconds": round(uptime, 2),
            "packets_captured": getattr(sniffer, "packets_captured", 0) if hasattr(sniffer, "packets_captured") else 0,
            "flows_processed": getattr(live_monitor, "flows_processed", 0) if hasattr(live_monitor, "flows_processed") else 0,
            "active_flows": 0,
            "operational_metrics": {
                "queue_drop_count": queue_drop_count,
                "non_ip_count": non_ip_count,
                "malformed_ip_count": malformed_ip_count
            }
        }

    async def start(self, role: Role) -> bool:
        """Starts the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if self._is_running:
                logger.info("Monitoring already running.")
                return True

            try:
                await live_monitor.start()
                self._is_running = True
                self._start_time = time.time()
                logger.info("Live Monitoring Pipeline Started.")

                event = MonitorStatusEvent(payload={"status": "started", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
                return True
            except Exception as e:
                self._is_running = False
                self._start_time = 0.0
                logger.error(f"Failed to start live monitor: {e}", exc_info=True)
                raise

    async def stop(self, role: Role) -> bool:
        """Stops the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if not self._is_running:
                logger.info("Monitoring already stopped.")
                return True

            try:
                await live_monitor.stop()
            except Exception as e:
                logger.error(f"Error stopping live monitor: {e}", exc_info=True)
            finally:
                self._is_running = False
                self._start_time = 0.0
                logger.info("Live Monitoring Pipeline Stopped.")

                event = MonitorStatusEvent(payload={"status": "stopped", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
            return True


monitoring_service = MonitoringService()

