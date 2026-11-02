import time
from typing import Dict, Any, List, Optional
from backend.database.collections import BaseRepository
from backend.database.database import DatabaseManager
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class DeviceBehaviorRepository(BaseRepository):
    """
    Dedicated MongoDB repository for Layer 2 Device Behaviors & Baselines.
    Enforces a strict unique index on 'mac' to guarantee zero duplication.
    """
    def __init__(self):
        super().__init__("device_behaviors")
        self._index_initialized = False

    async def ensure_indexes(self):
        """Ensures unique indexing on 'mac' and supporting index on 'current_ip'."""
        if self._index_initialized:
            return
        try:
            # Unique index on MAC guarantees no duplicated device documents
            await self.collection.create_index("mac", unique=True)
            await self.collection.create_index("current_ip")
            await self.collection.create_index("status")
            self._index_initialized = True
            logger.info("[DeviceBehaviorRepository] Ensured unique index on 'mac' and 'current_ip'.")
        except Exception as e:
            logger.warning(f"[DeviceBehaviorRepository] Index setup notice: {e}")

    async def get_by_mac(self, mac: str) -> Optional[Dict[str, Any]]:
        if not mac:
            return None
        doc = await self.collection.find_one({"mac": mac.upper()})
        return self._format_out(doc) if doc else None

    async def get_by_ip(self, ip: str) -> Optional[Dict[str, Any]]:
        if not ip:
            return None
        doc = await self.collection.find_one({"current_ip": ip})
        return self._format_out(doc) if doc else None

    async def upsert_device(self, mac: str, profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Atomic upsert using '$setOnInsert' for baseline templates and '$set' for runtime state.
        Guarantees zero duplicate documents.
        """
        await self.ensure_indexes()
        mac_clean = mac.upper()
        now = time.time()

        # Fields to set only upon first creation
        insert_defaults = {
            "mac": mac_clean,
            "created_at": now,
            "role": profile_data.get("role", "workstation"),
            "hostname": profile_data.get("hostname", f"Device-{mac_clean[-5:].replace(':', '')}"),
            "time_profile": profile_data.get("time_profile", {
                "active_start_hour": 8,
                "active_end_hour": 20,
                "active_days": [1, 2, 3, 4, 5],
                "total_sessions_tracked": 0,
            }),
            "network_policy": profile_data.get("network_policy", {
                "allowed_destinations": [],
                "restricted_internal_subnets": [],
                "allowed_outbound_ports": [80, 443, 53, 123],
                "forbidden_ports": [22, 445, 3389, 1433, 135],
            }),
            "traffic_baseline": {
                "avg_hourly_bytes": 0,
                "max_burst_bytes": 0,
                "observed_flows": 0
            },
            "status": "NORMAL",
            "anomaly_score": 0.0,
            "recent_violations": []
        }

        # Fields to update dynamically on every encounter
        update_fields: Dict[str, Any] = {
            "last_seen": now,
            "updated_at": now
        }
        if "current_ip" in profile_data:
            update_fields["current_ip"] = profile_data["current_ip"]
        if "hostname" in profile_data and profile_data["hostname"]:
            update_fields["hostname"] = profile_data["hostname"]
        if "status" in profile_data:
            update_fields["status"] = profile_data["status"]
        if "anomaly_score" in profile_data:
            update_fields["anomaly_score"] = profile_data["anomaly_score"]

        update_ops: Dict[str, Any] = {
            "$setOnInsert": insert_defaults,
            "$set": update_fields
        }

        # If destinations are provided, add them into the mathematical set (zero duplication)
        if "allowed_destinations" in profile_data and profile_data["allowed_destinations"]:
            update_ops["$addToSet"] = {
                "network_policy.allowed_destinations": {"$each": profile_data["allowed_destinations"]}
            }

        await self.collection.update_one(
            {"mac": mac_clean},
            update_ops,
            upsert=True
        )

        doc = await self.collection.find_one({"mac": mac_clean})
        return self._format_out(doc)

    async def log_violation(self, mac: str, violation: Dict[str, Any], new_status: str = "COMPROMISED", anomaly_score: float = 0.85):
        """Pushes a violation into a capped 20-entry sliding window without document bloat."""
        mac_clean = mac.upper()
        now = time.time()
        violation["timestamp"] = now

        await self.collection.update_one(
            {"mac": mac_clean},
            {
                "$set": {
                    "status": new_status,
                    "anomaly_score": anomaly_score,
                    "updated_at": now
                },
                "$push": {
                    "recent_violations": {
                        "$each": [violation],
                        "$slice": -20  # Keep only the last 20 violations
                    }
                }
            }
        )

    async def set_quarantine_status(self, mac: str, is_quarantined: bool, reason: str = ""):
        mac_clean = mac.upper()
        now = time.time()
        new_status = "QUARANTINED" if is_quarantined else "NORMAL"
        await self.collection.update_one(
            {"mac": mac_clean},
            {
                "$set": {
                    "status": new_status,
                    "anomaly_score": 1.0 if is_quarantined else 0.0,
                    "quarantine_reason": reason if is_quarantined else None,
                    "quarantined_at": now if is_quarantined else None,
                    "updated_at": now
                }
            }
        )

device_behaviors_repo = DeviceBehaviorRepository()
