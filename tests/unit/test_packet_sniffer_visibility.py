import time
import unittest
from unittest.mock import MagicMock, patch
from backend.live_monitor.packet_sniffer import PacketSniffer
from backend.live_monitor.heuristic_fallback import HeuristicFallback


class TestPacketSnifferVisibility(unittest.TestCase):
    def test_case_a_non_ip_silent_counter(self):
        """Case A: Non-IP packets (ARP/STP) should increment non_ip_count silently without logging."""
        sniffer = PacketSniffer(max_queue_size=100)

        # Mock synthetic Non-IP packet
        mock_pkt = MagicMock()
        mock_pkt.haslayer.return_value = False # Neither IP nor IPv6

        sniffer._process_packet(mock_pkt)

        self.assertEqual(sniffer.non_ip_count, 1)
        self.assertEqual(sniffer.malformed_ip_count, 0)
        self.assertEqual(sniffer.packet_queue.qsize(), 0)

    def test_case_b_malformed_ip_routes_to_heuristic_callback(self):
        """Case B: IP packet with malformed transport layer should invoke heuristic_callback."""
        callback_mock = MagicMock()
        sniffer = PacketSniffer(max_queue_size=100, heuristic_callback=callback_mock)

        # Mock IP packet where TCP layer access raises an exception (malformed dataofs)
        mock_pkt = MagicMock()

        def haslayer_side_effect(layer):
            from scapy.all import IP, TCP
            if layer == IP or layer == TCP:
                return True
            return False

        mock_pkt.haslayer.side_effect = haslayer_side_effect
        mock_pkt.time = time.time()
        mock_pkt.len = 100

        mock_ip = MagicMock()
        mock_ip.src = "192.168.1.50"
        mock_ip.dst = "10.0.0.1"

        mock_tcp = MagicMock()
        mock_tcp.dataofs = 2 # Invalid dataofs (< 5) causing ValueError

        def getitem_side_effect(layer):
            from scapy.all import IP, TCP
            if layer == IP:
                return mock_ip
            if layer == TCP:
                return mock_tcp
            raise KeyError(layer)

        mock_pkt.__getitem__.side_effect = getitem_side_effect

        sniffer._process_packet(mock_pkt)

        self.assertEqual(sniffer.malformed_ip_count, 1)
        self.assertEqual(sniffer.packet_queue.qsize(), 0)
        callback_mock.assert_called_once()
        called_args = callback_mock.call_args[0][0]
        self.assertEqual(called_args["src_ip"], "192.168.1.50")
        self.assertEqual(called_args["protocol"], "MALFORMED")

    def test_queue_drop_summary_rate_limiting(self):
        """Queue overflow should increment queue_drop_count and emit rate-limited summary logs."""
        sniffer = PacketSniffer(max_queue_size=2)
        sniffer.last_drop_log_time = time.time() - 10.0 # Force interval elapsed

        # Mock valid IP packet
        def create_valid_pkt():
            mock_pkt = MagicMock()

            def haslayer(layer):
                from scapy.all import IP
                return layer == IP

            mock_pkt.haslayer.side_effect = haslayer
            mock_pkt.time = time.time()
            mock_pkt.len = 64

            mock_ip = MagicMock()
            mock_ip.src = "1.1.1.1"
            mock_ip.dst = "2.2.2.2"
            mock_pkt.__getitem__.return_value = mock_ip
            return mock_pkt

        # Fill queue capacity (size 2)
        sniffer._process_packet(create_valid_pkt())
        sniffer._process_packet(create_valid_pkt())
        self.assertEqual(sniffer.packet_queue.qsize(), 2)

        # 3rd packet should overflow queue
        with patch('backend.live_monitor.packet_sniffer.logger.warning') as mock_log:
            sniffer._process_packet(create_valid_pkt())
            mock_log.assert_called_once()
            log_msg = mock_log.call_args[0][0]
            self.assertIn("[QUEUE_DROP_SUMMARY]", log_msg)
            self.assertIn("Dropped 1 packets", log_msg)

    def test_end_to_end_malformed_packet_heuristic_escalation(self):
        """Integration test: Case B malformed packet triggers HeuristicFallback rule evaluation."""
        hf = HeuristicFallback()
        escalation_events = []

        def callback(partial_dict):
            verdict = hf.evaluate(partial_dict)
            if verdict.escalate:
                escalation_events.append(verdict)

        sniffer = PacketSniffer(heuristic_callback=callback)

        # Construct malformed packet payload on sensitive port 22 (SSH) with malformed header
        mock_pkt = MagicMock()

        def haslayer(layer):
            from scapy.all import IP, TCP
            return layer in (IP, TCP)

        mock_pkt.haslayer.side_effect = haslayer
        mock_pkt.time = time.time()
        mock_pkt.len = 50

        mock_ip = MagicMock()
        mock_ip.src = "192.168.1.99"
        mock_ip.dst = "10.0.0.1"

        mock_tcp = MagicMock()
        mock_tcp.sport = 45000
        mock_tcp.dport = 22 # Sensitive port
        mock_tcp.dataofs = 1 # Malformed dataofs (<5)

        def getitem(layer):
            from scapy.all import IP, TCP
            if layer == IP:
                return mock_ip
            if layer == TCP:
                return mock_tcp
            raise KeyError(layer)

        mock_pkt.__getitem__.side_effect = getitem

        sniffer._process_packet(mock_pkt)

        self.assertEqual(len(escalation_events), 1)
        verdict = escalation_events[0]
        self.assertTrue(verdict.escalate)
        self.assertEqual(verdict.confidence_floor, 75.0)
        self.assertIn("Rule1_SensitivePortMalformedPayload", verdict.matched_rules)

    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_monitor_service_malformed_heuristic_enforcement_routing(self, MockResponseEngine):
        """Test that MonitorService._handle_malformed_heuristic routes Case B escalated verdicts to ResponseEngine."""
        from backend.live_monitor.monitor_service import MonitorService
        from backend.ai.contracts import Action

        mock_resp_engine_instance = MockResponseEngine.return_value
        mock_resp_engine_instance.handle_verdict = MagicMock()

        ms = MonitorService()
        ms.response_engine = mock_resp_engine_instance

        # Malformed packet targeting sensitive SSH port 22
        malformed_dict = {
            "src_ip": "192.168.1.99",
            "dst_ip": "10.0.0.1",
            "src_port": 45000,
            "dst_port": 22,
            "protocol": "MALFORMED",
            "length": 50,
            "raw_len": 50,
            "is_malformed": True,
            "parse_error": "Malformed TCP dataofs",
        }

        ms._handle_malformed_heuristic(malformed_dict)

        # Assert response engine was invoked with RECOMMEND_BLOCK (ceiling enforced for 1 matched rule)
        mock_resp_engine_instance.handle_verdict.assert_called_once()
        called_args = mock_resp_engine_instance.handle_verdict.call_args[0]
        prediction = called_args[0]
        action = called_args[1]
        context = called_args[2]

        self.assertTrue(prediction.verdict)
        self.assertEqual(prediction.model_used, "HeuristicFallback_CaseB")
        self.assertEqual(action, Action.RECOMMEND_BLOCK)
        self.assertEqual(context["src_ip"], "192.168.1.99")
        self.assertIn("Rule1_SensitivePortMalformedPayload", context["matched_rules"])

    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_monitor_service_heuristic_quarantine_ceiling_enforcement(self, MockResponseEngine):
        """Verify that single-rule heuristic match on internal IP is capped at RECOMMEND_BLOCK instead of QUARANTINE."""
        from backend.live_monitor.monitor_service import MonitorService
        from backend.ai.contracts import Action

        mock_resp_engine_instance = MockResponseEngine.return_value
        mock_resp_engine_instance.handle_verdict = MagicMock()

        ms = MonitorService()
        ms.response_engine = mock_resp_engine_instance

        # Single rule matched for internal IP 192.168.1.50
        malformed_dict = {
            "src_ip": "192.168.1.50",
            "dst_ip": "192.168.1.1",
            "src_port": 50000,
            "dst_port": 22,
            "protocol": "MALFORMED",
            "length": 50,
            "raw_len": 50,
            "is_malformed": True,
            "parse_error": "Malformed TCP dataofs",
        }

        ms._handle_malformed_heuristic(malformed_dict)

        mock_resp_engine_instance.handle_verdict.assert_called_once()
        action = mock_resp_engine_instance.handle_verdict.call_args[0][1]
        self.assertEqual(action, Action.RECOMMEND_BLOCK, "Single heuristic rule must not trigger internal QUARANTINE.")

    def test_heuristic_evaluation_throughput_performance_ceiling(self):
        """Enforce strict latency ceiling for HeuristicFallback evaluation (<15ms for 1000 calls)."""
        import logging
        hf = HeuristicFallback()
        sample_payload = {
            "src_ip": "192.168.1.100",
            "dst_ip": "10.0.0.5",
            "src_port": 54321,
            "dst_port": 22,
            "protocol": "TCP",
            "length": 150,
            "raw_len": 150,
            "is_malformed": True,
        }

        iterations = 1000
        # Disable logging during pure execution benchmark to eliminate log formatting/I/O noise
        logging.disable(logging.CRITICAL)
        try:
            start = time.perf_counter()
            for _ in range(iterations):
                hf.evaluate(sample_payload)
            elapsed_ms = (time.perf_counter() - start) * 1000.0
        finally:
            logging.disable(logging.NOTSET)

        # Assert 1000 evaluations execute in under 15ms (<0.015ms / 15 microseconds per call)
        self.assertLess(
            elapsed_ms,
            15.0,
            f"Heuristic evaluation performance regression: {iterations} calls took {elapsed_ms:.2f}ms (>15.0ms target)"
        )


if __name__ == "__main__":
    unittest.main()
