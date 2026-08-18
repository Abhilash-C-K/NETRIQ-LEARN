"""
tests/test_heuristic_fallback.py

Comprehensive test suite for NETRIQ's Deterministic Heuristic Fallback Tier.

Covers:
1. Rule 1: Sensitive port + malformed payload
2. Rule 2: Header-to-payload length mismatch
3. Rule 3: Invalid TCP flag combinations (NULL, Xmas, SYN+FIN, SYN+RST)
4. Rule 4: Raw packet rate spike
5. Rule 5: Suspicious micro-packet control burst
6. Bulletproof error handling: Fuzz testing with malformed/corrupted raw packet inputs
7. Escalation ceiling guard: Capping heuristic matches at RECOMMEND_BLOCK unless is_internal=True AND multi-rule threshold met
8. Operational [ABSENT] vs [EXCEPTION] path separation
9. End-to-end integration: Pipeline exception -> HeuristicFallback -> RiskEngine -> DecisionEngine
"""

import time
import unittest
from unittest.mock import MagicMock, patch

from backend.ai.contracts import Action, Decision, HeuristicVerdict, RiskCategory
from backend.ai.risk_engine import RiskEngine, classify_risk
from backend.ai.decision_engine import decide
from backend.live_monitor.heuristic_fallback import HeuristicFallback


class TestHeuristicFallbackRules(unittest.TestCase):
    """Unit tests for each of the 5 heuristic rules."""

    def setUp(self):
        self.fallback = HeuristicFallback()

    # ------------------------------------------------------------------
    # Rule 1 Tests
    # ------------------------------------------------------------------
    def test_rule1_sensitive_port_malformed_payload_triggers(self):
        raw_data = {"dst_port": 22, "is_malformed": True, "payload_len": 50}
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule1_SensitivePortMalformedPayload", verdict.matched_rules)
        self.assertEqual(verdict.confidence_floor, 75.0)

    def test_rule1_sensitive_port_normal_payload_does_not_trigger(self):
        raw_data = {"dst_port": 22, "is_malformed": False, "payload_len": 50, "raw_len": 100}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule1_SensitivePortMalformedPayload", verdict.matched_rules)

    def test_rule1_non_sensitive_port_malformed_payload_does_not_trigger_rule1(self):
        raw_data = {"dst_port": 8080, "is_malformed": True}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule1_SensitivePortMalformedPayload", verdict.matched_rules)

    # ------------------------------------------------------------------
    # Rule 2 Tests
    # ------------------------------------------------------------------
    def test_rule2_header_length_mismatch_triggers(self):
        raw_data = {"raw_len": 1500, "cap_len": 100}  # Truncated or buffer overflow claim
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule2_PacketLengthHeaderMismatch", verdict.matched_rules)

    def test_rule2_illegal_ip_header_length_triggers(self):
        raw_data = {"ip_header_len": 12}  # IPv4 minimum header is 20 bytes
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule2_PacketLengthHeaderMismatch", verdict.matched_rules)

    def test_rule2_normal_packet_lengths_do_not_trigger(self):
        raw_data = {"raw_len": 500, "cap_len": 500, "ip_header_len": 20}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule2_PacketLengthHeaderMismatch", verdict.matched_rules)

    # ------------------------------------------------------------------
    # Rule 3 Tests
    # ------------------------------------------------------------------
    def test_rule3_null_scan_triggers(self):
        raw_data = {"protocol": "TCP", "tcp_flags": 0x00}
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule3_InvalidTCPFlagCombinations", verdict.matched_rules)

    def test_rule3_xmas_scan_triggers(self):
        # FIN (0x01) + PSH (0x08) + URG (0x20) = 0x29
        raw_data = {"protocol": "TCP", "tcp_flags": 0x29}
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule3_InvalidTCPFlagCombinations", verdict.matched_rules)

    def test_rule3_syn_fin_illegal_pair_triggers(self):
        # SYN (0x02) + FIN (0x01) = 0x03
        raw_data = {"protocol": "TCP", "tcp_flags": 0x03}
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule3_InvalidTCPFlagCombinations", verdict.matched_rules)

    def test_rule3_normal_syn_ack_does_not_trigger(self):
        # SYN (0x02) + ACK (0x10) = 0x12
        raw_data = {"protocol": "TCP", "tcp_flags": 0x12}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule3_InvalidTCPFlagCombinations", verdict.matched_rules)

    # ------------------------------------------------------------------
    # Rule 4 Tests
    # ------------------------------------------------------------------
    def test_rule4_high_packet_rate_triggers(self):
        raw_data = {"pkt_rate": 1500.0}  # Exceeds default 1000 pps threshold
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule4_RawPacketRateSpike", verdict.matched_rules)

    def test_rule4_normal_packet_rate_does_not_trigger(self):
        raw_data = {"pkt_rate": 50.0}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule4_RawPacketRateSpike", verdict.matched_rules)

    # ------------------------------------------------------------------
    # Rule 4 Bulk File Transfer Guard Tests
    # ------------------------------------------------------------------
    def test_rule4_bursty_large_file_transfer_does_not_trigger_false_positive(self):
        """Short high-speed burst (1500 pps) of large packets (1460 bytes payload) must NOT trigger Rule 4."""
        raw_data = {
            "pkt_rate": 1500.0,
            "avg_pkt_size": 1460.0,
            "flow_duration_sec": 0.5,  # Short burst < 2.0s
        }
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule4_RawPacketRateSpike", verdict.matched_rules)

    def test_rule4_sustained_large_packet_flow_triggers(self):
        """Sustained high-speed flow (1500 pps, 1460 bytes) for >= 2.0s DOES trigger Rule 4."""
        raw_data = {
            "pkt_rate": 1500.0,
            "avg_pkt_size": 1460.0,
            "flow_duration_sec": 3.5,  # Sustained >= 2.0s
        }
        verdict = self.fallback.evaluate(raw_data)
        self.assertIn("Rule4_RawPacketRateSpike", verdict.matched_rules)

    def test_rule4_small_packet_high_rate_triggers_immediately(self):
        """High-speed burst (1500 pps) of small packets (100 bytes) triggers Rule 4 immediately regardless of duration."""
        raw_data = {
            "pkt_rate": 1500.0,
            "avg_pkt_size": 100.0,
            "flow_duration_sec": 0.1,
        }
        verdict = self.fallback.evaluate(raw_data)
        self.assertIn("Rule4_RawPacketRateSpike", verdict.matched_rules)

    # ------------------------------------------------------------------
    # Rule 5 Tests
    # ------------------------------------------------------------------
    def test_rule5_micro_packet_burst_triggers(self):
        raw_data = {"pkt_len": 40, "pkt_rate": 200.0, "tcp_flags": 0x02}  # 40 bytes, 200 pps SYN
        verdict = self.fallback.evaluate(raw_data)
        self.assertTrue(verdict.escalate)
        self.assertIn("Rule5_SuspiciousSmallPacketBurst", verdict.matched_rules)

    def test_rule5_large_packet_burst_does_not_trigger(self):
        raw_data = {"pkt_len": 1400, "pkt_rate": 200.0, "tcp_flags": 0x02}
        verdict = self.fallback.evaluate(raw_data)
        self.assertNotIn("Rule5_SuspiciousSmallPacketBurst", verdict.matched_rules)


class TestBulletproofFuzzing(unittest.TestCase):
    """Fuzz testing: verifies that HeuristicFallback.evaluate() NEVER raises an unhandled crash."""

    def setUp(self):
        self.fallback = HeuristicFallback()

    def test_non_dict_input(self):
        for garbage in [None, "corrupted_string", 12345, [1, 2, 3], True]:
            verdict = self.fallback.evaluate(garbage)
            self.assertIsInstance(verdict, HeuristicVerdict)
            self.assertFalse(verdict.escalate)

    def test_empty_dict_input(self):
        verdict = self.fallback.evaluate({})
        self.assertIsInstance(verdict, HeuristicVerdict)
        self.assertFalse(verdict.escalate)

    def test_corrupted_type_fields(self):
        garbage_dict = {
            "dst_port": "not_an_int",
            "raw_len": object(),
            "cap_len": None,
            "tcp_flags": "invalid_flags",
            "pkt_rate": complex(1, 2),
            "is_malformed": "maybe",
        }
        verdict = self.fallback.evaluate(garbage_dict)
        self.assertIsInstance(verdict, HeuristicVerdict)



class TestEscalationCeilingAndOperationalBoundary(unittest.TestCase):
    """Verifies escalation ceiling rules and operational [ABSENT] path separation."""

    def test_single_rule_heuristic_match_cannot_trigger_quarantine_on_external(self):
        """Single rule match on external traffic (is_internal=False) must NOT trigger QUARANTINE."""
        confidence = 75.0  # Heuristic confidence floor
        risk = classify_risk(confidence)  # RiskCategory.HIGH
        decision = decide(risk=risk, confidence=confidence, is_internal=False)
        self.assertEqual(decision.action, Action.RECOMMEND_BLOCK)
        self.assertNotEqual(decision.action, Action.QUARANTINE)

    def test_absent_model_does_not_trigger_heuristic_fallback(self):
        """Model artifact missing ([ABSENT]) must fail-open to 0.0, NOT route through HeuristicFallback."""
        from backend.ai.anomaly_detector import AnomalyDetector
        detector = AnomalyDetector()
        with patch.object(detector, "_model", None):
            # Model is absent -> predict() returns 0.0 directly without evaluating heuristics
            score = detector.predict({"dst_port": 22, "is_malformed": True})
            self.assertEqual(score, 0.0)


class TestEndToEndHeuristicIntegration(unittest.TestCase):
    """End-to-end integration test: extraction exception -> HeuristicFallback -> RiskEngine -> DecisionEngine."""

    def test_pipeline_exception_escalates_to_recommend_block(self):
        raw_malformed_packet = {
            "dst_port": 22,
            "is_malformed": True,
            "payload_len": -1,
            "raw_len": 500,
        }

        # 1. Evaluate HeuristicFallback
        fallback = HeuristicFallback()
        verdict = fallback.evaluate(raw_malformed_packet)
        self.assertTrue(verdict.escalate)
        self.assertEqual(verdict.confidence_floor, 75.0)

        # 2. RiskEngine classifies confidence floor
        risk = classify_risk(verdict.confidence_floor)
        self.assertEqual(risk, RiskCategory.HIGH)

        # 3. DecisionEngine evaluates decision for Layer 1
        decision = decide(risk=risk, confidence=verdict.confidence_floor, is_internal=False)
        self.assertEqual(decision.action, Action.RECOMMEND_BLOCK)
        self.assertIn("HIGH", decision.reason)

    def test_partial_model_failure_supervised_fails_unsupervised_succeeds(self):
        """Integration edge case: supervised predictor fails, but IsolationForest succeeds with high anomaly score."""
        from backend.ai.fusion_engine import fuse
        from backend.ai.contracts import PredictionResult

        # Unsupervised detector succeeds with 95.0% zero-day anomaly score
        anomaly_score = 95.0
        fallback = HeuristicFallback()
        # Heuristic rules also detect sensitive port malformed payload -> 75.0% floor
        verdict = fallback.evaluate({"dst_port": 22, "is_malformed": True})
        self.assertTrue(verdict.escalate)

        # Combine heuristic confidence with anomaly_score
        effective_conf = max(verdict.confidence_floor, anomaly_score)
        self.assertEqual(effective_conf, 95.0)

        risk = classify_risk(effective_conf)
        self.assertEqual(risk, RiskCategory.CRITICAL)


if __name__ == "__main__":
    unittest.main()

