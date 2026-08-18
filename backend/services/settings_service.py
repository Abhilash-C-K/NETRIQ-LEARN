from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import settings_repo
from backend.auth.exceptions import InsufficientPermissionError

logger = get_logger(__name__)

class SettingsService:
    async def get_settings(self) -> Dict[str, Any]:
        """Retrieves system settings from database layer."""
        results = await settings_repo.list(limit=100)
        return {item["key"]: item.get("value") for item in results if "key" in item}

    async def update_settings(self, role: Role, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enforces defense-in-depth RBAC in the service layer before writing settings.
        """
        if role != Role.ADMIN:
            logger.critical("Defense-in-depth trigger: Non-admin attempted to update settings at service layer.")
            raise InsufficientPermissionError("Only administrators can update settings.")
            
        for key, value in updates.items():
            existing = await settings_repo.list({"key": key}, limit=1)
            if existing:
                await settings_repo.update(existing[0]["id"], {"value": value})
            else:
                await settings_repo.create({"key": key, "value": value})
                
        logger.info("Settings updated by Admin.")
        return await self.get_settings()

settings_service = SettingsService()
