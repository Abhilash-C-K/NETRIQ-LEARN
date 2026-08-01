from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from backend.schemas.user import UserPublic, UserUpdateReq
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.database.collections import users_repo

router = APIRouter(prefix="/users", tags=["users"])

@router.get("", response_model=List[UserPublic], dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def list_users():
    try:
        results = await users_repo.list(limit=100)
        return [UserPublic(**user) for user in results]
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.patch("/{user_id}", response_model=UserPublic, dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def update_user(user_id: str, req: UserUpdateReq):
    try:
        updates = req.dict(exclude_unset=True)
        await users_repo.update(user_id, updates)
        updated = await users_repo.get(user_id)
        return UserPublic(**updated)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
