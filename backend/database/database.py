import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from backend.utils.logger import get_logger
from backend.database.exceptions import DatabaseConnectionError

logger = get_logger(__name__)

# Config values will be read inside connect_db() to ensure load_dotenv() has executed.

from typing import Optional

class DatabaseManager:
    """
    Async Singleton Connection Manager for MongoDB.
    """
    client: Optional[AsyncIOMotorClient] = None
    db = None

    @classmethod
    async def connect_db(cls, retries: int = 5, backoff_factor: float = 1.5):
        """
        Initializes connection pool with exponential backoff on failure.
        Designed to be called during FastAPI lifespan startup event.
        """
        if cls.client is not None:
            return

        mongo_uri = os.getenv("MONGODB_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
        mongo_db_name = os.getenv("MONGO_DB", "netriq_db")
        min_pool_size = int(os.getenv("MONGO_MIN_POOL_SIZE", "10"))
        max_pool_size = int(os.getenv("MONGO_MAX_POOL_SIZE", "100"))

        delay = 1.0
        for attempt in range(1, retries + 1):
            try:
                logger.info(f"Attempting MongoDB connection to '{mongo_db_name}' (Attempt {attempt}/{retries})...")
                cls.client = AsyncIOMotorClient(
                    mongo_uri,
                    minPoolSize=min_pool_size,
                    maxPoolSize=max_pool_size,
                    serverSelectionTimeoutMS=5000  # 5 seconds timeout for selection
                )
                # Force a call to verify connection
                await cls.client.server_info()
                cls.db = cls.client[mongo_db_name]
                logger.info(f"Successfully connected to MongoDB database: {mongo_db_name}")
                await cls._ensure_indexes()
                return
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.error(f"MongoDB connection failed: {e}")
                if attempt < retries:
                    logger.info(f"Retrying in {delay} seconds...")
                    await asyncio.sleep(delay)
                    delay *= backoff_factor
                else:
                    logger.critical("Failed to connect to MongoDB after maximum retries.")
                    cls.client = None
                    raise DatabaseConnectionError("MongoDB connection exhausted retries.") from e

    @classmethod
    async def close_db(cls):
        """Gracefully shuts down connection pool."""
        if cls.client is not None:
            cls.client.close()
            cls.client = None
            cls.db = None
            logger.info("MongoDB connection closed.")

    @classmethod
    def get_db(cls):
        """Returns the active database instance. Raises error if not connected."""
        if cls.db is None:
            raise DatabaseConnectionError("Database is not connected. Call connect_db() first.")
        return cls.db

    @classmethod
    async def _ensure_indexes(cls):
        """Delegates to the authoritative index definitions in database/indexes.py."""
        from backend.database.indexes import ensure_indexes  # lazy to avoid circular import
        await ensure_indexes()

    @classmethod
    async def health_check(cls) -> bool:
        """Pings the database to verify connectivity for api/health.py."""
        if cls.client is None:
            return False
        try:
            await cls.client.admin.command('ping')
            return True
        except Exception as e:
            logger.warning(f"Database health check failed: {e}")
            return False
