"""
user_service.py
Service layer for user management operations.
api/users.py must call this service instead of accessing the database directly.
"""

import time
from typing import List, Dict, Any, Optional
from backend.utils.logger import get_logger
from backend.database.collections import users_repo
from backend.database.exceptions import DocumentNotFoundError

logger = get_logger(__name__)


class UserService:
    async def list_users(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Returns all user records (sensitive fields stripped by schema layer)."""
        return await users_repo.list(limit=limit)

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        """Returns a single user record by ID."""
        return await users_repo.get(user_id)

    async def update_user(self, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Applies partial updates to a user document and returns the updated record."""
        # Safety: never allow role or hashed_password to be updated via this generic path
        updates.pop("hashed_password", None)
        updates.pop("role", None)
        updates.pop("_id", None)
        updates["updated_at"] = time.time()

        await users_repo.update(user_id, updates)
        return await users_repo.get(user_id)

    async def change_role(self, user_id: str, new_role: str) -> Dict[str, Any]:
        """Admin-only: changes a user's role."""
        await users_repo.update(user_id, {"role": new_role, "updated_at": time.time()})
        logger.info(f"Role changed for user {user_id} -> {new_role}")
        return await users_repo.get(user_id)

    async def deactivate_user(self, user_id: str) -> bool:
        """
        Soft-deletes a user by setting is_active=False and clearing their session.
        This is preferred over hard-delete to preserve audit trail.
        """
        await users_repo.update(user_id, {
            "is_active": False,
            "active_refresh_token_hash": None,  # Revoke active sessions
            "deactivated_at": time.time()
        })
        logger.warning(f"User {user_id} deactivated and sessions revoked.")
        return True

    async def delete_user(self, user_id: str) -> bool:
        """Hard-deletes a user record. Use deactivate_user for safer offboarding."""
        await users_repo.delete(user_id)
        logger.warning(f"User {user_id} permanently deleted.")
        return True


user_service = UserService()
