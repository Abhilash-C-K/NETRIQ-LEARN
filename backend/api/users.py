from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.schemas.user import UserPublic, UserUpdateReq
from backend.schemas.response import MessageResponse
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.services.user_service import user_service
from backend.utils.exceptions import DocumentNotFoundError
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=List[UserPublic], dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def list_users():
    """Returns all user records. Admin only."""
    try:
        results = await user_service.list_users(limit=100)
        return [UserPublic(**user) for user in results]
    except Exception as e:
        logger.error(f"Failed to list users: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve users")


@router.patch("/{user_id}", response_model=UserPublic, dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def update_user(user_id: str, req: UserUpdateReq):
    """Partially updates a user's profile fields. Admin only."""
    try:
        updated = await user_service.update_user(user_id, req.model_dump(exclude_unset=True))
        return UserPublic(**updated)
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to update user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update user")


@router.patch("/{user_id}/deactivate", response_model=MessageResponse, dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def deactivate_user(user_id: str):
    """
    Soft-deactivates a user account, revoking all active sessions.
    Preferred over hard-delete to preserve the audit trail. Admin only.
    """
    try:
        success = await user_service.deactivate_user(user_id)
        return MessageResponse(message=f"User {user_id} deactivated and sessions revoked.", success=success)
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to deactivate user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to deactivate user")


@router.delete("/{user_id}", response_model=MessageResponse, dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def delete_user(user_id: str):
    """Hard-deletes a user record. Irreversible — prefer /deactivate for offboarding. Admin only."""
    try:
        success = await user_service.delete_user(user_id)
        return MessageResponse(message=f"User {user_id} permanently deleted.", success=success)
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to delete user {user_id}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to delete user")

