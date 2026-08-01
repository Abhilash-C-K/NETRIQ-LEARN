from fastapi import Request, HTTPException, status
from typing import Callable, Any
from backend.auth.roles import PERMISSION_MATRIX, Role, Capabilities
from backend.auth.exceptions import InsufficientPermissionError

def require_permission(required_capability: Capabilities) -> Callable:
    """
    FastAPI Dependency that enforces API-level authorization based on the user's role.
    Extracts the user from `request.state.user` (injected by middleware/auth.py).
    Raises HTTP 403 Forbidden if the user lacks the required capability.
    """
    def permission_dependency(request: Request) -> Any:
        # Check if the middleware successfully injected the user object
        if not hasattr(request.state, "user") or not request.state.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required."
            )
            
        user = request.state.user
        role_str = user.get("role")
        
        try:
            user_role = Role(role_str)
        except ValueError:
            # Unknown role string
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Unknown role '{role_str}' assigned to user."
            )

        # Look up the capabilities for this role
        allowed_capabilities = PERMISSION_MATRIX.get(user_role, [])
        
        if required_capability not in allowed_capabilities:
            # Strict API enforcement: hide the fact that the resource might exist 
            # or explicitly tell them they are forbidden. Standard is 403.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permission. Requires '{required_capability.value}' capability."
            )
            
        return user
        
    return permission_dependency
