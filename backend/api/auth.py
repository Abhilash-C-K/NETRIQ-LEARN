from fastapi import APIRouter, Depends, HTTPException, status, Request
from backend.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from backend.schemas.response import MessageResponse
from backend.auth.auth_service import AuthService
from backend.auth.roles import Capabilities
from backend.auth.permissions import require_permission
from backend.auth.exceptions import (
    InvalidCredentialsError,
    AccountLockedError,
    TokenExpiredError,
    InvalidTokenError,
    WeakPasswordError
)

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    try:
        result = await auth_service.login(request.email, request.password)
        return TokenResponse(**result)
    except InvalidCredentialsError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    except AccountLockedError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: RefreshRequest):
    try:
        result = await auth_service.refresh_token(request.refresh_token)
        return TokenResponse(**result)
    except (TokenExpiredError, InvalidTokenError) as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))

@router.post("/logout", response_model=MessageResponse)
async def logout(request: Request, refresh_req: RefreshRequest):
    user = getattr(request.state, "user", None)
    user_id = user.get("sub") if user else None
    
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    
    success = await auth_service.logout(user_id)
    return MessageResponse(message="Logged out successfully.", success=success)

@router.post("/register", response_model=MessageResponse, dependencies=[Depends(require_permission(Capabilities.MANAGE_USERS))])
async def register(request: RegisterRequest, req: Request):
    try:
        admin_id = req.state.user.get("sub")
        await auth_service.register_user(
            admin_user_id=admin_id,
            email=request.email,
            raw_password=request.password,
            role=request.role
        )
        return MessageResponse(message=f"User {request.email} registered successfully.", success=True)
    except (InvalidCredentialsError, WeakPasswordError) as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
