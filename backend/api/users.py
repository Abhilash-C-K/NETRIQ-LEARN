from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.schemas.user import UserPublic, UserUpdateReq
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.services.user_service import user_service
from backend.utils.exceptions import DocumentNotFoundError

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=List[UserPublic],
    dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))]
)
async def list_users():
    """Returns all user records. Admin only."""
    try:
        results = await user_service.list_users(limit=100)
        return [UserPublic(**user) for user in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch(
    "/{user_id}",
    response_model=UserPublic,
    dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))]
)
async def update_user(user_id: str, req: UserUpdateReq):
    """Partially updates a user's profile fields. Admin only."""
    try:
        updated = await user_service.update_user(user_id, req.dict(exclude_unset=True))
        return UserPublic(**updated)
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.patch(
    "/{user_id}/deactivate",
    dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))]
)
async def deactivate_user(user_id: str):
    """
    Soft-deactivates a user account, revoking all active sessions.
    Preferred over hard-delete to preserve the audit trail. Admin only.
    """
    try:
        success = await user_service.deactivate_user(user_id)
        return {"success": success, "message": f"User {user_id} deactivated and sessions revoked."}
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.delete(
    "/{user_id}",
    dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))]
)
async def delete_user(user_id: str):
    """Hard-deletes a user record. Irreversible — prefer /deactivate for offboarding. Admin only."""
    try:
        success = await user_service.delete_user(user_id)
        return {"success": success, "message": f"User {user_id} permanently deleted."}
    except DocumentNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
