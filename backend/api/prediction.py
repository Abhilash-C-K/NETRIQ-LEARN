from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.ai.contracts import PredictionResult

router = APIRouter(prefix="/prediction", tags=["prediction"])

@router.post("/test", response_model=PredictionResult, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def test_prediction(payload: Dict[str, Any]):
    try:
        # Stub for testing a prediction manually
        return PredictionResult(
            verdict=False,
            confidence=99.9,
            model_used="test_model",
            risk_category="low",
            latency_ms=1.5
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
