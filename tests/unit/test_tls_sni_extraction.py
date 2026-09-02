import time
import asyncio
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from backend.live_monitor.packet_sniffer import PacketSniffer
from backend.live_monitor.flow_builder import FlowBuilder, FlowData
from backend.live_monitor.monitor_service import MonitorService
from backend.live_monitor.feature_extractor import FeatureExtractor
from backend.ai.contracts import Action


def make_synthetic_client_hello(hostname: str) -> bytes:
    """Helper generating a binary TLS 1.2 ClientHello record payload with a specified SNI hostname."""
    hostname_bytes = hostname.encode('ascii')
    h_len = len(hostname_bytes)

    # Server Name extension (Type 0x0000)
    ext_sni = (
        b'\x00\x00' +
        (h_len + 5).to_bytes(2, 'big') +
        (h_len + 3).to_bytes(2, 'big') +
        b'\x00' +
        h_len.to_bytes(2, 'big') +
        hostname_bytes
    )

    ext_len = len(ext_sni)

    # ClientHello Handshake body
    ch_body = (
        b'\x03\x03' +
        b'\x00' * 32 + # Random (32B)
        b'\x00' + # Session ID len 0
        b'\x00\x02\x00\x9c' + # Cipher Suites len 2 + 1 cipher
        b'\x01\x00' + # Compression len 1 + null comp
        ext_len.to_bytes(2, 'big') +
        ext_sni
    )

    ch_handshake = b'\x01' + len(ch_body).to_bytes(3, 'big') + ch_body
    tls_record = b'\x16\x03\x01' + len(ch_handshake).to_bytes(2, 'big') + ch_handshake
    return tls_record


class TestTLSSNIExtraction(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    def test_1_boundary_compliance_feature_extractor_untouched(self):
        """Boundary Compliance: Verify FeatureExtractor produces exactly 71 ML features and does NOT contain 'sni'."""
        mock_flow = MagicMock()
        mock_flow.last_time = 100.0
        mock_flow.start_time = 90.0
        mock_flow.fwd_lengths = [100, 200]
        mock_flow.bwd_lengths = [50, 150]
        mock_flow.fwd_packets = 2
        mock_flow.bwd_packets = 2
        mock_flow.flow_iats = [0.1]
        mock_flow.fwd_iats = [0.1]
        mock_flow.bwd_iats = [0.1]
        mock_flow.active_times = []
        mock_flow.idle_times = []
        mock_flow.sni = "youtube.com"

        features = FeatureExtractor.extract_features(mock_flow)
        self.assertEqual(len(features), 71, "FeatureExtractor schema MUST contain exactly 71 ML features.")
        self.assertNotIn("sni", features, "SNI metadata MUST NOT be included as an ML feature.")

    def test_2_sni_parsing_success_client_hello(self):
        """Extraction Success: Verify valid TLS ClientHello extracts SNI hostname."""
        payload = make_synthetic_client_hello("youtube.com")
        extracted = PacketSniffer._parse_tls_sni_payload(payload)
        self.assertEqual(extracted, "youtube.com")

    def test_3_graceful_degradation_non_tls_and_truncated(self):
        """Graceful Degradation: Non-TLS, truncated, or non-ClientHello payloads return None without raising."""
        # Non-TLS HTTP GET payload
        http_payload = b"GET /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n"
        self.assertIsNone(PacketSniffer._parse_tls_sni_payload(http_payload))

        # Truncated payload (< 45 bytes)
        self.assertIsNone(PacketSniffer._parse_tls_sni_payload(b"\x16\x03\x01\x00"))

        # TLS ServerHello (Handshake type 0x02 instead of 0x01 ClientHello)
        server_hello = b"\x16\x03\x01\x00\x20\x02" + b"\x00" * 40
        self.assertIsNone(PacketSniffer._parse_tls_sni_payload(server_hello))

    def test_4_non_interference_with_case_a_b_classification(self):
        """Non-Interference: Corrupted/unparseable TLS payload on valid TCP packet yields sni=None and does NOT trigger Case B malformed counters."""
        sniffer = PacketSniffer(max_queue_size=100)

        # Mock valid IP/TCP packet carrying garbage payload on port 443
        garbage_payload = b"\x16\x03\x01\x00\x50\x01\x00\x00\x4c" + b"\xff" * 50

        mock_pkt = MagicMock()

        def haslayer_side_effect(layer):
            from scapy.all import IP, TCP
            return layer in (IP, TCP)

        mock_pkt.haslayer.side_effect = haslayer_side_effect
        mock_pkt.time = time.time()
        mock_pkt.len = 120

        mock_ip = MagicMock()
        mock_ip.src = "192.168.1.100"
        mock_ip.dst = "142.250.190.46"

        mock_tcp = MagicMock()
        mock_tcp.sport = 54321
        mock_tcp.dport = 443
        mock_tcp.dataofs = 5
        mock_tcp.flags = "PA"
        mock_tcp.load = garbage_payload
        mock_tcp.payload = garbage_payload

        def getitem_side_effect(layer):
            from scapy.all import IP, TCP
            if layer == IP: return mock_ip
            if layer == TCP: return mock_tcp
            raise KeyError(layer)

        mock_pkt.__getitem__.side_effect = getitem_side_effect

        sniffer._process_packet(mock_pkt)

        self.assertEqual(sniffer.malformed_ip_count, 0, "SNI parsing failure must NOT increment malformed_ip_count.")
        self.assertEqual(sniffer.packet_queue.qsize(), 1)
        enqueued_dict = sniffer.packet_queue.get()
        self.assertIsNone(enqueued_dict["sni"], "Garbage TLS payload must degrade gracefully to sni=None.")

    def test_5_config_validation_custom_monitored_port(self):
        """Config Validation: Verify SNI extraction runs on custom configured HTTPS ports (e.g., 8443)."""
        sniffer = PacketSniffer(max_queue_size=100)
        payload = make_synthetic_client_hello("custom-service.internal")

        mock_pkt = MagicMock()

        def haslayer_side_effect(layer):
            from scapy.all import IP, TCP
            return layer in (IP, TCP)

        mock_pkt.haslayer.side_effect = haslayer_side_effect
        mock_pkt.time = time.time()
        mock_pkt.len = 150

        mock_ip = MagicMock()
        mock_ip.src = "192.168.1.50"
        mock_ip.dst = "10.0.0.1"

        mock_tcp = MagicMock()
        mock_tcp.sport = 50000
        mock_tcp.dport = 8443 # Non-standard port
        mock_tcp.dataofs = 5
        mock_tcp.flags = "P"
        mock_tcp.load = payload
        mock_tcp.payload = payload

        def getitem_side_effect(layer):
            from scapy.all import IP, TCP
            if layer == IP: return mock_ip
            if layer == TCP: return mock_tcp
            raise KeyError(layer)

        mock_pkt.__getitem__.side_effect = getitem_side_effect

        with patch("backend.config.config.SNI_MONITORED_PORTS", [443, 8443]):
            sniffer._process_packet(mock_pkt)

        self.assertEqual(sniffer.packet_queue.qsize(), 1)
        enqueued_dict = sniffer.packet_queue.get()
        self.assertEqual(enqueued_dict["sni"], "custom-service.internal")

    @patch("backend.live_monitor.feature_extractor.FeatureExtractor.extract_features")
    @patch("backend.database.collections.threats_repo.create", new_callable=AsyncMock)
    @patch("backend.websocket.broadcaster.broadcaster.publish", new_callable=AsyncMock)
    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_6_flow_level_propagation_e2e_integration(
        self, MockResponseEngine, mock_publish, mock_threat_create, mock_extract_features
    ):
        """Flow Propagation E2E: Verify SNI propagates from PacketSniffer -> FlowBuilder -> MonitorService -> threats_repo & LiveVerdictEvent."""
        mock_resp_engine = MockResponseEngine.return_value
        mock_resp_engine.handle_verdict = AsyncMock(return_value=True)
        mock_extract_features.return_value = {"Flow Duration": 1000.0}

        ms = MonitorService()
        ms.response_engine = mock_resp_engine

        ms.predictor.predict = MagicMock(return_value={
            "dataset": "cicids2017",
            "prediction": "ANOMALY",
            "confidence": 91.0,
            "threat_level": "HIGH",
            "is_anomaly": True,
            "class_id": 1
        })

        # Synthetic ClientHello packet dict for port 443 with SNI youtube.com
        now = 1700000000.0
        pkt_ch = {
            'src_ip': '185.220.101.5', 'dst_ip': '8.8.8.8',
            'src_port': 50000, 'dst_port': 443,
            'protocol': 'TCP', 'length': 200, 'header_len': 20,
            'flags': {'PSH': True, 'ACK': True},
            'timestamp': now,
            'sni': 'youtube.com'
        }
        pkt_fin = {
            'src_ip': '185.220.101.5', 'dst_ip': '8.8.8.8',
            'src_port': 50000, 'dst_port': 443,
            'protocol': 'TCP', 'length': 54, 'header_len': 20,
            'flags': {'FIN': True, 'ACK': True},
            'timestamp': now + 0.1,
            'sni': None
        }

        packets = [pkt_ch, pkt_fin]
        pkt_index = 0

        def mock_get_packet(timeout=0.5):
            nonlocal pkt_index
            if pkt_index < len(packets):
                p = packets[pkt_index]
                pkt_index += 1
                return p
            return None

        ms._get_packet_blocking = mock_get_packet

        async def run_pipeline():
            ms._stop_event.clear()
            task = asyncio.create_task(ms._run_loop())
            await asyncio.sleep(0.12)
            ms._stop_event.set()
            await task

        self.loop.run_until_complete(run_pipeline())

        # Assert DB record contains sni field set to "youtube.com"
        mock_threat_create.assert_called_once()
        db_doc = mock_threat_create.call_args[0][0]
        self.assertEqual(db_doc["sni"], "youtube.com")

        # Assert WebSocket event payload contains sni
        mock_publish.assert_called_once()
        event = mock_publish.call_args[0][0]
        self.assertEqual(event.payload["sni"], "youtube.com")

    def test_7_performance_latency_ceiling_benchmark(self):
        """Performance Ceiling: Enforce that 1,000 TLS SNI parse calls complete within 15ms (<0.015ms per call)."""
        payload = make_synthetic_client_hello("performance-test.netriq.io")

        start = time.perf_counter()
        iterations = 1000
        for _ in range(iterations):
            PacketSniffer._parse_tls_sni_payload(payload)
        elapsed_ms = (time.perf_counter() - start) * 1000.0

        self.assertLess(
            elapsed_ms, 15.0,
            f"SNI parsing overhead exceeded 15ms ceiling for {iterations} calls: took {elapsed_ms:.2f}ms."
        )


if __name__ == "__main__":
    unittest.main()
