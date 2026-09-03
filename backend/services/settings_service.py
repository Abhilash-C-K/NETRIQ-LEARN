from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import settings_repo
from backend.auth.exceptions import InsufficientPermissionError
import backend.config.config as app_config

logger = get_logger(__name__)

CONFIG_ATTR_MAP = {
    "zero_day_weight": ("ZERO_DAY_WEIGHT", float),
    "high_anomaly_threshold": ("HIGH_ANOMALY_THRESHOLD", float),
    "anomaly_detector_enabled": ("ANOMALY_DETECTOR_ENABLED", bool),
    "heuristic_min_rules_for_quarantine": ("HEURISTIC_MIN_RULES_FOR_QUARANTINE", int),
}

class SettingsService:
    async def get_settings(self) -> Dict[str, Any]:
        """Retrieves system settings from database layer merged with live runtime values."""
        results = await settings_repo.list(limit=100)
        persisted = {item["key"]: item.get("value") for item in results if "key" in item}
        
        # Merge live runtime values as base
        merged = {
            "anomaly_detector_enabled": getattr(app_config, "ANOMALY_DETECTOR_ENABLED", True),
            "zero_day_weight": getattr(app_config, "ZERO_DAY_WEIGHT", 0.8),
            "high_anomaly_threshold": getattr(app_config, "HIGH_ANOMALY_THRESHOLD", 70.0),
            "heuristic_min_rules_for_quarantine": getattr(app_config, "HEURISTIC_MIN_RULES_FOR_QUARANTINE", 2),
            "quarantine_mode": "sdn_vlan",
            "threat_retention_days": 7,
            "login_max_attempts": 5,
            "login_lockout_minutes": 15,
        }
        merged.update(persisted)
        return merged

    async def update_settings(self, role: Role, updates: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enforces defense-in-depth RBAC, validates bounds, persists to DB,
        and dynamically propagates updates to the live AI pipeline in memory.
        """
        if role != Role.ADMIN:
            logger.critical("Defense-in-depth trigger: Non-admin attempted to update settings at service layer.")
            raise InsufficientPermissionError("Only administrators can update settings.")

        # 1. Bounds Validation
        if "zero_day_weight" in updates:
            val = float(updates["zero_day_weight"])
            if not (0.0 <= val <= 1.0):
                raise ValueError(f"zero_day_weight must be between 0.0 and 1.0. Got: {val}")

        if "high_anomaly_threshold" in updates:
            val = float(updates["high_anomaly_threshold"])
            if not (0.0 <= val <= 100.0):
                raise ValueError(f"high_anomaly_threshold must be between 0.0 and 100.0. Got: {val}")

        # 2. Persist to DB and Propagate to In-Memory Runtime Config
        for key, value in updates.items():
            existing = await settings_repo.list({"key": key}, limit=1)
            if existing:
                await settings_repo.update(existing[0]["id"], {"value": value})
            else:
                await settings_repo.create({"key": key, "value": value})

            # Propagate to live running AI engines
            if key in CONFIG_ATTR_MAP:
                attr_name, target_type = CONFIG_ATTR_MAP[key]
                typed_val = target_type(value)
                setattr(app_config, attr_name, typed_val)
                logger.info(f"[SettingsService] Dynamically updated live AI config {attr_name} = {typed_val}")

        logger.info("Settings updated by Admin and propagated to runtime engine.")
        return await self.get_settings()

    async def load_persisted_settings(self):
        """Loads persisted DB settings overrides into memory on application startup."""
        try:
            settings = await self.get_settings()
            for key, val in settings.items():
                if key in CONFIG_ATTR_MAP:
                    attr_name, target_type = CONFIG_ATTR_MAP[key]
                    typed_val = target_type(val)
                    setattr(app_config, attr_name, typed_val)
                    logger.info(f"[SettingsService] Restored persisted setting {attr_name} = {typed_val}")
        except Exception as e:
            logger.warning(f"[SettingsService] Could not restore persisted settings: {e}")

settings_service = SettingsService()
