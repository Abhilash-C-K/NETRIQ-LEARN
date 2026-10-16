import asyncio
from backend.utils.logger import get_logger
from backend.websocket.events import Event
from backend.websocket.manager import manager

logger = get_logger(__name__)

class Broadcaster:
    """
    Internal pub/sub interface used by backend services to emit events 
    to connected WebSocket clients.
    """
    async def publish(self, event: Event):
        """
        Reads the event's target_audience and fans out the message 
        to the appropriate roles via the manager.
        """
        logger.debug(f"Publishing event: {event.event_type.value} to {event.target_audience}")
        
        await self._fanout(event)
        
    async def _fanout(self, event: Event):
        tasks = [manager.broadcast_to_role(role, event) for role in set(event.target_audience)]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

broadcaster = Broadcaster()
