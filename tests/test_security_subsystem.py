import unittest
import time
from backend.ai.contracts import RiskCategory, Action, Decision
from backend.ai.risk_engine import classify_risk, RiskEngine
from backend.ai.decision_engine import decide, DecisionEngine
from backend.auth.password import validate_password_policy, hash_password, verify_password
from backend.auth.jwt_handler import create_access_token, create_refresh_token, verify_token
from backend.auth.exceptions import TokenExpiredError, InvalidTokenError, WeakPasswordError


class TestSecuritySubsystem(unittest.TestCase):

    # ==========================================
    # 1. RISK ENGINE & CLASSIFICATION TESTS
    # ==========================================

    def test_classify_risk_boundaries(self):
        """Tests exact boundary thresholds for risk classification."""
        self.assertEqual(classify_risk(0.0), RiskCategory.LOW)
        self.assertEqual(classify_risk(40.0), RiskCategory.LOW)
        self.assertEqual(classify_risk(40.1), RiskCategory.MEDIUM)
        self.assertEqual(classify_risk(70.0), RiskCategory.MEDIUM)
        self.assertEqual(classify_risk(70.1), RiskCategory.HIGH)
        self.assertEqual(classify_risk(90.0), RiskCategory.HIGH)
        self.assertEqual(classify_risk(90.1), RiskCategory.CRITICAL)
        self.assertEqual(classify_risk(100.0), RiskCategory.CRITICAL)

    def test_risk_engine_calculate_risk_clamp(self):
        """Tests effective confidence calculation and clamping to 100.0."""
        engine = RiskEngine()
        
        # Normal addition: 50.0 + 10.0 = 60.0 -> MEDIUM
        self.assertEqual(engine.calculate_risk(confidence=50.0, anomaly_baseline=10.0), RiskCategory.MEDIUM)
        
        # Boundary clamp: 95.0 + 20.0 = 115.0 clamped to 100.0 -> CRITICAL
        self.assertEqual(engine.calculate_risk(confidence=95.0, anomaly_baseline=20.0), RiskCategory.CRITICAL)
        
        # Zero baseline: 85.0 -> HIGH
        self.assertEqual(engine.calculate_risk(confidence=85.0, anomaly_baseline=0.0), RiskCategory.HIGH)

    # ==========================================
    # 2. DECISION ENGINE TESTS (LAYER 1 & 2)
    # ==========================================

    def test_decision_engine_layer_1_external(self):
        """
        Layer 1 (External Traffic, is_internal=False):
        Must NEVER return QUARANTINE.
        Returns RECOMMEND_BLOCK if confidence >= 85.0, else NOTIFY.
        """
        # Low confidence external threat -> NOTIFY
        d1 = decide(risk=RiskCategory.MEDIUM, confidence=60.0, is_internal=False)
        self.assertEqual(d1.action, Action.NOTIFY)
        self.assertEqual(d1.target_layer, "Layer 1")
        
        # High confidence external threat -> RECOMMEND_BLOCK (recommend-only, never auto-block)
        d2 = decide(risk=RiskCategory.HIGH, confidence=88.0, is_internal=False)
        self.assertEqual(d2.action, Action.RECOMMEND_BLOCK)
        self.assertEqual(d2.target_layer, "Layer 1")
        
        # Critical risk external threat -> RECOMMEND_BLOCK
        d3 = decide(risk=RiskCategory.CRITICAL, confidence=95.0, is_internal=False)
        self.assertEqual(d3.action, Action.RECOMMEND_BLOCK)
        self.assertEqual(d3.target_layer, "Layer 1")

    def test_decision_engine_layer_2_internal(self):
        """
        Layer 2 (Internal Asset Traffic, is_internal=True):
        Triggers direct QUARANTINE on HIGH or CRITICAL risk regardless of recommendation step.
        """
        # Internal low risk -> NOTIFY
        d1 = decide(risk=RiskCategory.LOW, confidence=30.0, is_internal=True)
        self.assertEqual(d1.action, Action.NOTIFY)
        
        # Internal HIGH risk -> Direct QUARANTINE
        d2 = decide(risk=RiskCategory.HIGH, confidence=75.0, is_internal=True)
        self.assertEqual(d2.action, Action.QUARANTINE)
        self.assertEqual(d2.target_layer, "Layer 2")
        
        # Internal CRITICAL risk -> Direct QUARANTINE
        d3 = decide(risk=RiskCategory.CRITICAL, confidence=95.0, is_internal=True)
        self.assertEqual(d3.action, Action.QUARANTINE)
        self.assertEqual(d3.target_layer, "Layer 2")

    def test_decision_engine_single_source_of_truth_boundaries(self):
        """
        Tests single source of truth risk category boundaries:
        - MEDIUM (<= 70.0%) -> Action.NOTIFY
        - HIGH (>= 70.1%) -> Action.RECOMMEND_BLOCK (Layer 1) / Action.QUARANTINE (Layer 2)
        """
        # 70.0% confidence -> MEDIUM risk -> NOTIFY
        risk_med = classify_risk(70.0)
        self.assertEqual(risk_med, RiskCategory.MEDIUM)
        d_med = decide(risk=risk_med, confidence=70.0, is_internal=False)
        self.assertEqual(d_med.action, Action.NOTIFY)
        
        # 70.1% confidence -> HIGH risk -> RECOMMEND_BLOCK (Layer 1)
        risk_high = classify_risk(70.1)
        self.assertEqual(risk_high, RiskCategory.HIGH)
        d_high_l1 = decide(risk=risk_high, confidence=70.1, is_internal=False)
        self.assertEqual(d_high_l1.action, Action.RECOMMEND_BLOCK)
        self.assertEqual(d_high_l1.target_layer, "Layer 1")
        
        # 70.1% confidence -> HIGH risk -> QUARANTINE (Layer 2)
        d_high_l2 = decide(risk=risk_high, confidence=70.1, is_internal=True)
        self.assertEqual(d_high_l2.action, Action.QUARANTINE)
        self.assertEqual(d_high_l2.target_layer, "Layer 2")

    def test_rfc1918_is_internal_ip_checks(self):
        """Tests RFC1918 private IP determination for Layer 1 vs Layer 2 routing."""
        from backend.live_monitor.response_engine import is_private_ip, check_is_internal_flow
        
        # Private IPs (Layer 2 internal asset)
        self.assertTrue(is_private_ip("192.168.1.1"))
        self.assertTrue(is_private_ip("10.0.0.1"))
        self.assertTrue(is_private_ip("172.16.0.1"))
        self.assertTrue(is_private_ip("172.31.255.255"))
        
        # Public IPs (Layer 1 external attacker)
        self.assertFalse(is_private_ip("203.0.113.45"))
        self.assertFalse(is_private_ip("198.51.100.12"))
        self.assertFalse(is_private_ip("172.32.0.1"))
        self.assertFalse(is_private_ip("8.8.8.8"))

        # Flow origin check
        self.assertFalse(check_is_internal_flow("203.0.113.45", "192.168.1.1")) # External attacker -> Layer 1
        self.assertTrue(check_is_internal_flow("192.168.1.50", "192.168.1.1")) # Internal host -> Layer 2

    # ==========================================
    # 3. PASSWORD & AUTHENTICATION TESTS
    # ==========================================

    def test_password_policy_validation(self):
        """Tests password complexity enforcement (OWASP ASVS 2.1.1 min 12 chars)."""
        # Valid password (14 chars)
        self.assertTrue(validate_password_policy("SecurePass123!"))
        
        # Missing uppercase
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("weakpass123456")
            
        # Missing number
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("WeakPasswordLong")
            
        # Too short (< 12 chars)
        with self.assertRaises(WeakPasswordError):
            validate_password_policy("ShortPass1!")

    def test_password_hashing_and_verification(self):
        """Tests Bcrypt password hashing and verification."""
        raw_pw = "SuperSecret123"
        hashed = hash_password(raw_pw)
        
        self.assertNotEqual(hashed, raw_pw)
        self.assertTrue(verify_password(raw_pw, hashed))
        self.assertFalse(verify_password("WrongPassword123", hashed))

    # ==========================================
    # 4. JWT TOKEN HANDLER TESTS
    # ==========================================

    def test_jwt_issuance_and_verification(self):
        """Tests JWT creation and payload decoding."""
        user_id = "user_12345"
        role = "analyst"
        
        token = create_access_token(user_id=user_id, role=role)
        payload = verify_token(token, expected_type="access")
        
        self.assertEqual(payload["sub"], user_id)
        self.assertEqual(payload["role"], role)
        self.assertEqual(payload["type"], "access")
        self.assertIn("exp", payload)
        self.assertIn("iat", payload)

    def test_jwt_type_mismatch(self):
        """Tests rejection when verifying a refresh token as an access token."""
        refresh_token = create_refresh_token(user_id="user_12345")
        
        with self.assertRaises(InvalidTokenError):
            verify_token(refresh_token, expected_type="access")


if __name__ == "__main__":
    unittest.main()
