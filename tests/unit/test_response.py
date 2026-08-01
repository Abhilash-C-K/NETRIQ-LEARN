import unittest
from unittest.mock import AsyncMock, patch, MagicMock

from backend.ai.contracts import Action, PredictionResult, RiskCategory
from backend.response.response_engine import ResponseEngine
from backend.response.exceptions import FirewallUnreachableError, QuarantineFailedError

class TestResponseEngine(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Prevent actual adapter creation
        self.patcher_fw = patch('backend.response.response_engine.get_firewall_adapter')
        self.mock_get_fw = self.patcher_fw.start()
        
        # Mock sub-components
        self.mock_firewall = AsyncMock()
        self.mock_get_fw.return_value = self.mock_firewall
        
        self.patcher_quar = patch('backend.response.response_engine.QuarantineService')
        self.mock_quar_cls = self.patcher_quar.start()
        self.mock_quarantine = AsyncMock()
        self.mock_quar_cls.return_value = self.mock_quarantine
        
        self.patcher_wl = patch('backend.response.response_engine.WhitelistManager')
        self.mock_wl_cls = self.patcher_wl.start()
        self.mock_whitelist = AsyncMock()
        self.mock_wl_cls.return_value = self.mock_whitelist
        
        self.patcher_log = patch('backend.response.response_engine.ResponseLogger')
        self.mock_log_cls = self.patcher_log.start()
        self.mock_logger = AsyncMock()
        self.mock_log_cls.return_value = self.mock_logger
        
        self.engine = ResponseEngine()

    def tearDown(self):
        patch.stopall()

    async def test_whitelist_bypass(self):
        """Test that whitelisted IPs bypass enforcement actions."""
        self.mock_whitelist.is_whitelisted.return_value = True
        
        pred = PredictionResult(
            verdict=True, confidence=99.0, model_used="test", 
            risk_category=RiskCategory.HIGH, latency_ms=1.0
        )
        
        # Execute Layer 1 Block recommendation
        success = await self.engine.handle_verdict(pred, Action.RECOMMEND_BLOCK, {"src_ip": "1.1.1.1"})
        
        # Verify Firewall was NEVER called
        self.assertTrue(success)
        self.mock_firewall.block_ip.assert_not_called()
        self.mock_logger.log_action.assert_called_once()
        args = self.mock_logger.log_action.call_args[0]
        self.assertIn("Bypassed", args[2])

    async def test_layer1_recommend_block(self):
        """Test that Layer 1 ACTION ONLY calls firewall, not quarantine."""
        self.mock_whitelist.is_whitelisted.return_value = False
        self.mock_firewall.block_ip.return_value = True
        
        pred = PredictionResult(
            verdict=True, confidence=99.0, model_used="test", 
            risk_category=RiskCategory.HIGH, latency_ms=1.0
        )
        
        success = await self.engine.handle_verdict(pred, Action.RECOMMEND_BLOCK, {"src_ip": "1.1.1.1"})
        
        self.assertTrue(success)
        self.mock_firewall.block_ip.assert_called_once()
        self.mock_quarantine.quarantine_device.assert_not_called()

    async def test_layer2_quarantine(self):
        """Test that Layer 2 ACTION ONLY calls quarantine, not firewall."""
        self.mock_whitelist.is_whitelisted.return_value = False
        self.mock_quarantine.quarantine_device.return_value = True
        
        pred = PredictionResult(
            verdict=True, confidence=99.0, model_used="test", 
            risk_category=RiskCategory.HIGH, latency_ms=1.0
        )
        
        success = await self.engine.handle_verdict(pred, Action.QUARANTINE, {"src_ip": "10.0.0.5", "src_mac": "AA:BB"})
        
        self.assertTrue(success)
        self.mock_quarantine.quarantine_device.assert_called_once()
        self.mock_firewall.block_ip.assert_not_called()

    async def test_firewall_failure_isolation(self):
        """Test that a firewall crash doesn't raise unhandled exceptions."""
        self.mock_whitelist.is_whitelisted.return_value = False
        self.mock_firewall.block_ip.side_effect = FirewallUnreachableError("Timeout")
        
        pred = PredictionResult(
            verdict=True, confidence=99.0, model_used="test", 
            risk_category=RiskCategory.HIGH, latency_ms=1.0
        )
        
        success = await self.engine.handle_verdict(pred, Action.RECOMMEND_BLOCK, {"src_ip": "1.1.1.1"})
        
        # Exception should be caught and success=False
        self.assertFalse(success)
        self.mock_logger.log_action.assert_called_once()
        args = self.mock_logger.log_action.call_args[0]
        self.assertEqual(args[2], "Firewall API Error")

if __name__ == '__main__':
    unittest.main()
