from fastapi import APIRouter, Depends, HTTPException, status
from backend.schemas.response import ReverseActionReq, MessageResponse
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.services.response_service import response_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/response", tags=["response"])

@router.post("/reverse", response_model=MessageResponse, dependencies=[Depends(require_permission(Capabilities.REVERSE_RESPONSE_ACTION))])
async def reverse_action(req: ReverseActionReq):
    try:
        success = await response_service.reverse_action(action=req.action, target_ip=req.target_ip, target_mac=req.target_mac)
        if success:
            return MessageResponse(message="Action reversed successfully.", success=True)
        else:
            return MessageResponse(message="Failed to reverse action.", success=False)
    except Exception as e:
        logger.error(f"Failed to reverse action: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to reverse action")
