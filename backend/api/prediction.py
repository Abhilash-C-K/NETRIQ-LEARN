from fastapi import APIRouter, Depends, HTTPException, Request, status
from typing import Dict, Any
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.predict_service import predict_service, ExplanationNotFoundError, ExplanationFailedError
from backend.ai.contracts import PredictionResult, ExplanationResult

router = APIRouter(prefix="/prediction", tags=["prediction"])


@router.post(
    "/test",
    response_model=PredictionResult,
    dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))],
    summary="Run manual inference on raw features",
)
async def test_prediction(payload: Dict[str, Any], req: Request):
    """
    Runs the full supervised + anomaly + fusion pipeline on the supplied feature dict.
    Persists a PredictionRecord for later on-demand explanation.
    Returns prediction_id in response header X-Prediction-Id for use with /explain.
    """
    from fastapi.responses import JSONResponse
    try:
        result, _, prediction_id = await predict_service.predict_manual(
            role=get_request_role(req), features=payload
        )
        response = JSONResponse(content=result.model_dump())
        if prediction_id:
            response.headers["X-Prediction-Id"] = prediction_id
        return response
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get(
    "/{prediction_id}/explain",
    response_model=ExplanationResult,
    dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))],
    summary="On-demand SHAP or deviation explainability for a stored prediction",
)
async def explain_prediction(prediction_id: str, req: Request):
    """
    Returns per-feature attribution for a previously stored prediction.

    LATENCY NOTE: This endpoint is deliberately lazy/on-demand and NOT part of the
    ≤15ms prediction hot path. SHAP TreeExplainer may take 50–200ms. This is acceptable
    for a user-triggered dashboard request.

    Routes through predict_service → ExplainabilityEngine (never calls ai/ or database/ directly).
    - fusion_source in {supervised, agreement} → SHAP TreeExplainer (explanation_source='shap')
    - fusion_source == unsupervised           → deviation z-score  (explanation_source='deviation')
    """
    try:
        result = await predict_service.explain_prediction(prediction_id)
        return result
    except ExplanationNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except ExplanationFailedError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
