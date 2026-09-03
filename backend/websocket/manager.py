import asyncio
from typing import Dict, Set
from fastapi import WebSocket
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.websocket.events import Event

logger = get_logger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> set of active WebSockets (allows multi-device)
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Maps Role -> set of user_ids for quick broadcast lookup
        self.role_registry: Dict[Role, Set[str]] = {
            Role.VIEWER: set(),
            Role.ANALYST: set(),
            Role.ADMIN: set()
        }
        self._lock = asyncio.Lock()

    async def connect(self, user_id: str, role: Role, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            if user_id not in self.active_connections:
                self.active_connections[user_id] = set()
            self.active_connections[user_id].add(websocket)
            
            # Map user to role
            if role in self.role_registry:
                self.role_registry[role].add(user_id)
        
        logger.debug(f"WS Connect: User {user_id} (Role: {role.value})")

    async def disconnect(self, user_id: str, role: Role, websocket: WebSocket):
        async with self._lock:
            if user_id in self.active_connections:
                self.active_connections[user_id].discard(websocket)
                if not self.active_connections[user_id]:
                    # User has no more active connections, clean up
                    del self.active_connections[user_id]
                    if role in self.role_registry and user_id in self.role_registry[role]:
                        self.role_registry[role].discard(user_id)
                        
        logger.debug(f"WS Disconnect: User {user_id} (Role: {role.value})")

    async def send_to_user(self, user_id: str, event: Event):
        """Sends an event to all active connections for a specific user."""
        async with self._lock:
            websockets = self.active_connections.get(user_id, set()).copy()
            
        for ws in websockets:
            try:
                await ws.send_json(event.model_dump(mode="json"))
            except Exception as e:
                logger.error(f"Error sending to user {user_id}: {e}")
                # We do not disconnect here; let the receive loop catch the disconnect

    async def broadcast_to_role(self, role: Role, event: Event):
        """Fans out an event to all users holding the specified role."""
        async with self._lock:
            target_users = self.role_registry.get(role, set()).copy()
            
        # Fan out concurrently
        tasks = [self.send_to_user(uid, event) for uid in target_users]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()
