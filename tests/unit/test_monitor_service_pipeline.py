import asyncio
import unittest
from unittest.mock import MagicMock, patch, AsyncMock
from backend.live_monitor.monitor_service import MonitorService
from backend.ai.contracts import Action, RiskCategory


class TestMonitorServicePipeline(unittest.TestCase):
    def setUp(self):
        self.loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.loop)

    def tearDown(self):
        self.loop.close()

    @patch("backend.live_monitor.feature_extractor.FeatureExtractor.extract_features")
    @patch("backend.database.collections.threats_repo.create", new_callable=AsyncMock)
    @patch("backend.websocket.broadcaster.broadcaster.publish", new_callable=AsyncMock)
    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_completed_flow_persists_to_threats_repo_and_broadcasts(
        self, MockResponseEngine, mock_publish, mock_threat_create, mock_extract_features
    ):
        """Verify that completed flows in _run_loop persist to threats_repo and emit LiveVerdictEvent."""
        mock_resp_engine = MockResponseEngine.return_value
        mock_resp_engine.handle_verdict = AsyncMock()
        mock_extract_features.return_value = {"Flow Duration": 1000.0}

        ms = MonitorService()
        ms.response_engine = mock_resp_engine

        # Mock synthetic flow returned by FlowBuilder
        mock_flow = MagicMock()
        mock_flow.src_ip = "192.168.1.100"
        mock_flow.dst_ip = "10.0.0.5"
        mock_flow.src_port = 54321
        mock_flow.dst_port = 80
        mock_flow.protocol = "TCP"
        mock_flow.last_time = 1700000000.0

        ms.flow_builder.process_packet = MagicMock(return_value=[mock_flow])

        # Mock predictor to return BENIGN flow
        ms.predictor.predict = MagicMock(return_value={
            "dataset": "cicids2017",
            "prediction": "BENIGN",
            "confidence": 15.0,
            "threat_level": "LOW",
            "is_anomaly": False,
            "class_id": 0
        })

        packet_served = False

        def mock_get_packet(timeout=0.5):
            nonlocal packet_served
            if not packet_served:
                packet_served = True
                return {"dummy": "pkt"}
            return None

        ms._get_packet_blocking = mock_get_packet

        async def run_one_iter():
            ms._stop_event.clear()
            task = asyncio.create_task(ms._run_loop())
            await asyncio.sleep(0.08)
            ms._stop_event.set()
            await task

        self.loop.run_until_complete(run_one_iter())

        # 1. Assert threats_repo.create was called with formatted record
        mock_threat_create.assert_called_once()
        saved_record = mock_threat_create.call_args[0][0]
        self.assertEqual(saved_record["src_ip"], "192.168.1.100")
        self.assertEqual(saved_record["dst_ip"], "10.0.0.5")
        self.assertEqual(saved_record["prediction"], "BENIGN")
        self.assertEqual(saved_record["confidence"], 15.0)
        self.assertEqual(saved_record["severity"], "low")
        self.assertEqual(saved_record["action"], "notify")

        # 2. Assert broadcaster.publish was called with LiveVerdictEvent
        mock_publish.assert_called_once()
        event = mock_publish.call_args[0][0]
        self.assertEqual(event.event_type.value, "live_verdict")
        self.assertEqual(event.payload["src_ip"], "192.168.1.100")

        # 3. Assert ResponseEngine.handle_verdict was NOT called (benign flow)
        mock_resp_engine.handle_verdict.assert_not_called()

    @patch("backend.live_monitor.feature_extractor.FeatureExtractor.extract_features")
    @patch("backend.database.collections.threats_repo.create", new_callable=AsyncMock)
    @patch("backend.websocket.broadcaster.broadcaster.publish", new_callable=AsyncMock)
    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_actionable_flow_dispatches_to_response_engine(
        self, MockResponseEngine, mock_publish, mock_threat_create, mock_extract_features
    ):
        """Verify that actionable HIGH risk flows trigger ResponseEngine.handle_verdict."""
        mock_resp_engine = MockResponseEngine.return_value
        mock_resp_engine.handle_verdict = AsyncMock(return_value=True)
        mock_extract_features.return_value = {"Flow Duration": 1000.0}

        ms = MonitorService()
        ms.response_engine = mock_resp_engine

        mock_flow = MagicMock()
        mock_flow.src_ip = "185.220.101.5"  # External public IP
        mock_flow.dst_ip = "8.8.8.8"        # External public IP -> is_internal=False -> RECOMMEND_BLOCK
        mock_flow.src_port = 44444
        mock_flow.dst_port = 80
        mock_flow.protocol = "TCP"
        mock_flow.last_time = 1700000000.0

        ms.flow_builder.process_packet = MagicMock(return_value=[mock_flow])

        # Mock predictor to return HIGH threat anomaly (e.g. DDoS)
        ms.predictor.predict = MagicMock(return_value={
            "dataset": "cicids2017",
            "prediction": "ANOMALY",
            "confidence": 88.5,
            "threat_level": "HIGH",
            "is_anomaly": True,
            "class_id": 1
        })

        packet_served = False

        def mock_get_packet(timeout=0.5):
            nonlocal packet_served
            if not packet_served:
                packet_served = True
                return {"dummy": "pkt"}
            return None

        ms._get_packet_blocking = mock_get_packet

        async def run_one_iter():
            ms._stop_event.clear()
            task = asyncio.create_task(ms._run_loop())
            await asyncio.sleep(0.08)
            ms._stop_event.set()
            await task

        self.loop.run_until_complete(run_one_iter())

        # Assert ResponseEngine.handle_verdict WAS called with RECOMMEND_BLOCK for external IP
        mock_resp_engine.handle_verdict.assert_called_once()
        called_args = mock_resp_engine.handle_verdict.call_args[0]
        prediction_obj = called_args[0]
        action = called_args[1]
        context = called_args[2]

        self.assertTrue(prediction_obj.verdict)
        self.assertEqual(prediction_obj.confidence, 88.5)
        self.assertEqual(action, Action.RECOMMEND_BLOCK)
        self.assertEqual(context["src_ip"], "185.220.101.5")

        # Assert DB creation & WS broadcast also occurred
        mock_threat_create.assert_called_once()
        mock_publish.assert_called_once()

    @patch("backend.live_monitor.feature_extractor.FeatureExtractor.extract_features")
    @patch("backend.database.collections.threats_repo.create", new_callable=AsyncMock)
    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_internal_actionable_flow_triggers_quarantine(
        self, MockResponseEngine, mock_threat_create, mock_extract_features
    ):
        """Verify that actionable HIGH risk flows from internal IPs trigger QUARANTINE."""
        mock_resp_engine = MockResponseEngine.return_value
        mock_resp_engine.handle_verdict = AsyncMock(return_value=True)
        mock_extract_features.return_value = {"Flow Duration": 1000.0}

        ms = MonitorService()
        ms.response_engine = mock_resp_engine

        mock_flow = MagicMock()
        mock_flow.src_ip = "192.168.1.55"  # Internal IP -> Layer 2 QUARANTINE
        mock_flow.dst_ip = "192.168.1.1"
        mock_flow.src_port = 54321
        mock_flow.dst_port = 445
        mock_flow.protocol = "TCP"
        mock_flow.last_time = 1700000000.0

        ms.flow_builder.process_packet = MagicMock(return_value=[mock_flow])

        # Mock predictor to return HIGH threat anomaly
        ms.predictor.predict = MagicMock(return_value={
            "dataset": "cicids2017",
            "prediction": "ANOMALY",
            "confidence": 92.0,
            "threat_level": "CRITICAL",
            "is_anomaly": True,
            "class_id": 1
        })

        packet_served = False

        def mock_get_packet(timeout=0.5):
            nonlocal packet_served
            if not packet_served:
                packet_served = True
                return {"dummy": "pkt"}
            return None

        ms._get_packet_blocking = mock_get_packet

        async def run_one_iter():
            ms._stop_event.clear()
            task = asyncio.create_task(ms._run_loop())
            await asyncio.sleep(0.08)
            ms._stop_event.set()
            await task

        self.loop.run_until_complete(run_one_iter())

        mock_resp_engine.handle_verdict.assert_called_once()
        action = mock_resp_engine.handle_verdict.call_args[0][1]
        self.assertEqual(action, Action.QUARANTINE)

    @patch("backend.live_monitor.feature_extractor.FeatureExtractor.extract_features")
    @patch("backend.database.collections.threats_repo.create", new_callable=AsyncMock)
    @patch("backend.websocket.broadcaster.broadcaster.publish", new_callable=AsyncMock)
    @patch("backend.live_monitor.monitor_service.ResponseEngine")
    def test_e2e_packets_to_flow_builder_to_threats_repo(
        self, MockResponseEngine, mock_publish, mock_threat_create, mock_extract_features
    ):
        """End-to-end test: feeds raw synthetic packet dictionary into FlowBuilder inside MonitorService, verifying full pipeline execution."""
        mock_resp_engine = MockResponseEngine.return_value
        mock_resp_engine.handle_verdict = AsyncMock(return_value=True)
        mock_extract_features.return_value = {"Flow Duration": 5000.0}

        ms = MonitorService()
        ms.response_engine = mock_resp_engine

        # Mock predictor to return HIGH anomaly for the completed flow
        ms.predictor.predict = MagicMock(return_value={
            "dataset": "cicids2017",
            "prediction": "ANOMALY",
            "confidence": 85.0,
            "threat_level": "HIGH",
            "is_anomaly": True,
            "class_id": 1
        })

        # Generate a SYN-ACK-FIN TCP packet sequence that completes a flow in FlowBuilder
        now = 1700000000.0
        pkt_syn = {
            'src_ip': '185.220.101.5', 'dst_ip': '8.8.8.8',
            'src_port': 50000, 'dst_port': 80,
            'protocol': 'TCP', 'length': 60, 'header_len': 20,
            'flags': {'SYN': True, 'ACK': False, 'FIN': False},
            'timestamp': now
        }
        pkt_fin = {
            'src_ip': '185.220.101.5', 'dst_ip': '8.8.8.8',
            'src_port': 50000, 'dst_port': 80,
            'protocol': 'TCP', 'length': 54, 'header_len': 20,
            'flags': {'FIN': True, 'ACK': True},
            'timestamp': now + 0.1
        }

        packets = [pkt_syn, pkt_fin]
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

        # Verify flow completion reached DB, ResponseEngine, and WebSocket
        mock_threat_create.assert_called_once()
        mock_resp_engine.handle_verdict.assert_called_once()
        mock_publish.assert_called_once()

        db_doc = mock_threat_create.call_args[0][0]
        self.assertEqual(db_doc["src_ip"], "185.220.101.5")
        self.assertEqual(db_doc["dst_ip"], "8.8.8.8")
        self.assertEqual(db_doc["action"], "recommend_block")
        self.assertTrue(db_doc["is_anomaly"])


if __name__ == "__main__":
    unittest.main()
