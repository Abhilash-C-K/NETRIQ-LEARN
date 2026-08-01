from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.ai.contracts import PredictionResult
from backend.utils.exceptions import InsufficientPermissionError

logger = get_logger(__name__)

class PredictService:
    async def predict_manual(self, role: Role, features: Dict[str, Any]) -> PredictionResult:
        """
        Wraps the AI engine for manual or batch inference testing.
        Defense in depth: only admins or analysts should test models manually.
        """
        if role == Role.VIEWER:
            raise InsufficientPermissionError("Viewers cannot perform manual inference testing.")
            
        # Stub for calling ai.predictor
        # return await predictor.predict(features)
        
        # Mock result
        return PredictionResult(
            verdict=False,
            confidence=95.0,
            model_used="mock_model",
            risk_category="low",
            latency_ms=1.2
        )

predict_service = PredictService()
