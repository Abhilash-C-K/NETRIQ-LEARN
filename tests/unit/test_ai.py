import unittest
from unittest.mock import MagicMock, patch
import numpy as np

from backend.ai.contracts import TrafficType, RiskCategory, Action
from backend.ai.feature_encoder import FeatureEncoder
from backend.ai.risk_engine import RiskEngine
from backend.ai.decision_engine import DecisionEngine
from backend.ai.predictor import Predictor
from backend.utils.exceptions import PredictionError

class TestFeatureEncoder(unittest.TestCase):
    def test_unseen_category_fallback(self):
        """Test that unseen categorical values fallback gracefully without crashing."""
        mock_encoder = MagicMock()
        mock_encoder.classes_ = ["TCP", "UDP"]
        mock_encoder.transform.return_value = [1.0]

        encoders = {"Protocol": mock_encoder}
        fe = FeatureEncoder(encoders)
        
        # Unseen protocol 'ICMP'
        encoded = fe.encode({"Protocol": "ICMP", "Length": 150})
        
        # 'Length' should be passed through, 'Protocol' should fallback to 0.0
        self.assertEqual(encoded["Protocol"], 0.0)
        self.assertEqual(encoded["Length"], 150.0)

class TestRiskEngine(unittest.TestCase):
    def setUp(self):
        self.engine = RiskEngine({"LOW_MAX": 30.0, "MEDIUM_MAX": 60.0, "HIGH_MAX": 85.0})

    def test_threshold_boundaries(self):
        """Test confidence scores against threshold boundaries."""
        self.assertEqual(self.engine.calculate_risk(20.0), RiskCategory.LOW)
        self.assertEqual(self.engine.calculate_risk(45.0), RiskCategory.MEDIUM)
        self.assertEqual(self.engine.calculate_risk(80.0), RiskCategory.HIGH)
        self.assertEqual(self.engine.calculate_risk(95.0), RiskCategory.CRITICAL)

    def test_anomaly_baseline_bump(self):
        """Test that a high baseline pushes a medium confidence into high risk."""
        # 55 + 10 = 65 -> HIGH
        self.assertEqual(self.engine.calculate_risk(55.0, anomaly_baseline=10.0), RiskCategory.HIGH)

class TestDecisionEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DecisionEngine()

    def test_layer1_notify(self):
        """Low/Medium risk on Layer 1 should notify only."""
        action = self.engine.evaluate(RiskCategory.MEDIUM, {"is_internal": False})
        self.assertEqual(action, Action.NOTIFY)

    def test_layer1_recommend_block(self):
        """High risk on Layer 1 should recommend block."""
        action = self.engine.evaluate(RiskCategory.HIGH, {"is_internal": False})
        self.assertEqual(action, Action.RECOMMEND_BLOCK)

    def test_layer2_quarantine(self):
        """High risk on internal traffic (Layer 2) should trigger quarantine directly."""
        action = self.engine.evaluate(RiskCategory.HIGH, {"is_internal": True})
        self.assertEqual(action, Action.QUARANTINE)

class TestPredictor(unittest.TestCase):
    @patch('backend.ai.predictor.ModelManager')
    def test_prediction_flow(self, MockModelManager):
        """Integration test for Predictor flow using mock models."""
        # Setup mocks
        mock_manager_instance = MockModelManager.return_value
        mock_model = MagicMock()
        mock_model.predict_proba.return_value = np.array([[0.1, 0.9]]) # 90% anomaly
        mock_manager_instance.get_model.return_value = mock_model
        mock_manager_instance.get_model_name.return_value = "MockModel_v1"
        mock_manager_instance.get_encoder.return_value = {}
        mock_scaler = MagicMock()
        mock_scaler.feature_names_in_ = np.array(["f1", "f2"])
        mock_scaler.transform.side_effect = lambda x: x
        mock_manager_instance.get_scaler.return_value = mock_scaler

        predictor = Predictor()
        
        # Run prediction
        features = {"f1": 10, "f2": 20}
        result = predictor.predict(features, TrafficType.NETWORK)

        # Assertions
        self.assertTrue(result.verdict)
        self.assertEqual(result.confidence, 90.0)
        self.assertEqual(result.model_used, "MockModel_v1")
        # 90% usually falls into HIGH or CRITICAL depending on defaults
        self.assertIn(result.risk_category, [RiskCategory.HIGH, RiskCategory.CRITICAL])
        self.assertTrue(result.latency_ms > 0)

    @patch('backend.ai.predictor.ModelManager')
    def test_predictor_schema_mismatch_raises_error(self, MockModelManager):
        """Verify that supplying an incomplete feature vector matching scaler contract fails loudly."""
        mock_manager_instance = MockModelManager.return_value
        mock_scaler = MagicMock()
        mock_scaler.feature_names_in_ = np.array(["f1", "f2", "f3_missing"])
        mock_manager_instance.get_scaler.return_value = mock_scaler
        mock_manager_instance.get_encoder.return_value = {}

        predictor = Predictor()

        # Input only has f1 and f2, missing f3_missing
        incomplete_features = {"f1": 10, "f2": 20}
        with self.assertRaises(PredictionError) as ctx:
            predictor.predict(incomplete_features, TrafficType.NETWORK)

        self.assertIn("[SCHEMA_MISMATCH]", str(ctx.exception))

    @patch('backend.ai.predictor.ModelManager')
    def test_predictor_same_length_wrong_keys_raises_error(self, MockModelManager):
        """Verify that supplying a feature dict with matching length but invalid/typo'd key names fails loudly."""
        mock_manager_instance = MockModelManager.return_value
        mock_scaler = MagicMock()
        mock_scaler.feature_names_in_ = np.array(["f1", "f2", "f3"])
        mock_manager_instance.get_scaler.return_value = mock_scaler
        mock_manager_instance.get_encoder.return_value = {}

        predictor = Predictor()

        # Input has 3 keys (matching length 3), but "f3_typo" instead of "f3"
        typo_features = {"f1": 10, "f2": 20, "f3_typo": 30}
        with self.assertRaises(PredictionError) as ctx:
            predictor.predict(typo_features, TrafficType.NETWORK)

        self.assertIn("[SCHEMA_MISMATCH]", str(ctx.exception))

if __name__ == '__main__':
    unittest.main()
