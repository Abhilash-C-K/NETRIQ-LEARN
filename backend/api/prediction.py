from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any
from backend.auth.roles import Capabilities, Role
from backend.auth.permissions import require_permission
from backend.services.predict_service import predict_service
from backend.ai.contracts import PredictionResult

router = APIRouter(prefix="/prediction", tags=["prediction"])

@router.post("/test", response_model=PredictionResult, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def test_prediction(payload: Dict[str, Any], req: Request):
    try:
        user_role_str = req.state.user.get("role", "viewer") if hasattr(req.state, "user") and req.state.user else "viewer"
        role = Role(user_role_str) if user_role_str in [r.value for r in Role] else Role.VIEWER
        return await predict_service.predict_manual(role=role, features=payload)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
