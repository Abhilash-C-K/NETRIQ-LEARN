import asyncio
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.websocket.broadcaster import broadcaster
from backend.websocket.events import MonitorStatusEvent

# We mock live_monitor.monitor_service since it's outside this prompt's scope
# from backend.live_monitor.monitor_service import monitor_service

logger = get_logger(__name__)

class MonitoringService:
    def __init__(self):
        self._is_running = False
        self._lock = asyncio.Lock()

    async def start(self, role: Role) -> bool:
        """Starts the live monitoring pipeline. Idempotent."""
        async with self._lock:
            if self._is_running:
                logger.info("Monitoring already running.")
                return True
                
            # await monitor_service.start()
            self._is_running = True
            logger.info("Live Monitoring Pipeline Started.")
            
            # Broadcast status change
            event = MonitorStatusEvent(payload={"status": "started"})
            await broadcaster.publish(event)
            return True

    async def stop(self, role: Role) -> bool:
        """Stops the live monitoring pipeline. Idempotent."""
        async with self._lock:
            if not self._is_running:
                logger.info("Monitoring already stopped.")
                return True
                
            # await monitor_service.stop()
            self._is_running = False
            logger.info("Live Monitoring Pipeline Stopped.")
            
            # Broadcast status change
            event = MonitorStatusEvent(payload={"status": "stopped"})
            await broadcaster.publish(event)
            return True

monitoring_service = MonitoringService()
