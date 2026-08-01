import unittest
from unittest.mock import patch, AsyncMock
from backend.auth.roles import Role
from backend.services.monitoring_service import MonitoringService

class TestMonitoringIntegration(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.service = MonitoringService()
        self.patcher_broadcaster = patch('backend.services.monitoring_service.broadcaster')
        self.mock_broadcaster = self.patcher_broadcaster.start()

    def tearDown(self):
        patch.stopall()

    async def test_idempotent_start_stop(self):
        """Verify start/stop locks prevent double-spawning pipelines."""
        
        # Start pipeline
        success = await self.service.start(Role.ADMIN)
        self.assertTrue(success)
        self.assertTrue(self.service._is_running)
        self.mock_broadcaster.publish.assert_called_once()
        
        # Start again (should be idempotent)
        self.mock_broadcaster.reset_mock()
        success_again = await self.service.start(Role.ADMIN)
        self.assertTrue(success_again)
        self.mock_broadcaster.publish.assert_not_called() # No new broadcast
        
        # Stop pipeline
        success_stop = await self.service.stop(Role.ADMIN)
        self.assertTrue(success_stop)
        self.assertFalse(self.service._is_running)
        self.mock_broadcaster.publish.assert_called_once()

if __name__ == '__main__':
    unittest.main()
