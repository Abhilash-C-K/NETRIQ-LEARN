import os
import pymongo
from backend.database.database import DatabaseManager
from backend.utils.logger import get_logger

logger = get_logger(__name__)

# Configurable TTL for high-volume flow data. Default 7 days (7 * 86400 seconds)
THREAT_RETENTION_DAYS = int(os.getenv("THREAT_RETENTION_DAYS", "7"))
TTL_SECONDS = THREAT_RETENTION_DAYS * 86400

async def ensure_indexes():
    """
    Creates necessary indexes for performance and data lifecycle management.
    Should be called during application startup.
    """
    db = DatabaseManager.get_db()
    if db is None:
        logger.error("Cannot ensure indexes: Database not connected.")
        return

    logger.info("Ensuring database indexes...")

    try:
        # 1. Threats Collection (High Volume)
        threats_coll = db["threats"]
        
        # Compound index for dashboard queries (order matters: equality/sort/range or as queried)
        # Dashboard queries typically filter by timestamp (range) and severity (equality)
        # We index timestamp descending, then severity, then src_ip
        await threats_coll.create_index([
            ("timestamp", pymongo.DESCENDING),
            ("severity", pymongo.ASCENDING),
            ("src_ip", pymongo.ASCENDING)
        ], background=True, name="idx_dashboard_query")

        # TTL index for automatic deletion of raw flow data
        await threats_coll.create_index(
            [("timestamp", pymongo.ASCENDING)], 
            expireAfterSeconds=TTL_SECONDS,
            background=True,
            name="idx_ttl_retention"
        )
        logger.info(f"Threats TTL index set to {THREAT_RETENTION_DAYS} days.")

        # 2. Users Collection (Low Volume)
        users_coll = db["users"]
        # Unique index on email to enforce RBAC model uniqueness
        await users_coll.create_index(
            [("email", pymongo.ASCENDING)],
            unique=True,
            background=True,
            name="idx_unique_email"
        )

        # 3. Incidents Collection (Medium Volume)
        incidents_coll = db["incidents"]
        # Index for analyst queue sorting and filtering
        await incidents_coll.create_index([
            ("status", pymongo.ASCENDING),
            ("created_at", pymongo.DESCENDING)
        ], background=True, name="idx_incident_queue")

        logger.info("All indexes ensured successfully.")

    except Exception as e:
        logger.error(f"Failed to ensure indexes: {e}")
        # We log and swallow the error so app startup doesn't crash if DB permissions are tight,
        # but in production you might want to raise it depending on strictness.
