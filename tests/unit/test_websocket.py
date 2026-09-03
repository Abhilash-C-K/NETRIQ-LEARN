import unittest
from unittest.mock import AsyncMock, MagicMock
from backend.auth.roles import Role
from backend.websocket.manager import ConnectionManager
from backend.websocket.events import LiveVerdictEvent

class TestWebSocketManager(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.manager = ConnectionManager()

    async def test_connect_and_disconnect(self):
        """Test user and role registry mapping."""
        mock_ws = AsyncMock()
        
        # Connect user
        await self.manager.connect("user1", Role.ANALYST, mock_ws)
        self.assertIn("user1", self.manager.active_connections)
        self.assertIn("user1", self.manager.role_registry[Role.ANALYST])
        
        # Disconnect user
        await self.manager.disconnect("user1", Role.ANALYST, mock_ws)
        self.assertNotIn("user1", self.manager.active_connections)
        self.assertNotIn("user1", self.manager.role_registry[Role.ANALYST])

    async def test_broadcast_to_role_scoping(self):
        """Verify events are only sent to targeted roles."""
        mock_ws_analyst = AsyncMock()
        mock_ws_viewer = AsyncMock()
        
        await self.manager.connect("analyst1", Role.ANALYST, mock_ws_analyst)
        await self.manager.connect("viewer1", Role.VIEWER, mock_ws_viewer)
        
        # Emit a LIVE_VERDICT which only targets [ANALYST, ADMIN]
        event = LiveVerdictEvent(payload={"threat": "critical"})
        
        # Broadcaster fanout simulates looping over target_audience
        for role in event.target_audience:
            await self.manager.broadcast_to_role(role, event)
            
        mock_ws_analyst.send_json.assert_called_once()
        mock_ws_viewer.send_json.assert_not_called()

if __name__ == '__main__':
    unittest.main()
