import os
import time
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient
from backend.utils.logger import get_logger

logger = get_logger(__name__)

MONGO_URI = os.getenv("MONGODB_URL", os.getenv("MONGO_URI", "mongodb://localhost:27017"))
MONGO_DB_NAME = os.getenv("MONGO_DB", "netriq_db")

async def clone_database_on_atlas(source_name: str = None, target_name: str = "netriq_db_backup") -> Dict[str, Any]:
    """
    Clones all collections and indexes directly on MongoDB Atlas to a designated backup database.
    Provides immediate hot-standby copy for instant disaster recovery without local storage overhead.
    """
    source_name = source_name or MONGO_DB_NAME
    client = AsyncIOMotorClient(MONGO_URI)
    src_db = client[source_name]
    target_db = client[target_name]

    logger.info(f"Initiating Atlas database clone: '{source_name}' -> '{target_name}'...")
    collections = await src_db.list_collection_names()
    summary = {}
    start_time = time.time()

    for col_name in collections:
        if col_name.startswith("system."):
            continue
        col_start = time.time()
        src_col = src_db[col_name]
        target_col = target_db[col_name]

        # Bulk copy documents in batches
        cursor = src_col.find({})
        batch = []
        await target_col.delete_many({})
        async for doc in cursor:
            batch.append(doc)
            if len(batch) >= 1000:
                await target_col.insert_many(batch)
                batch = []
        if batch:
            await target_col.insert_many(batch)

        # Copy indexes
        try:
            indexes = await src_col.index_information()
            for idx_name, idx_info in indexes.items():
                if idx_name != "_id_":
                    keys = idx_info["key"]
                    unique = idx_info.get("unique", False)
                    sparse = idx_info.get("sparse", False)
                    await target_col.create_index(keys, name=idx_name, unique=unique, sparse=sparse)
        except Exception as e:
            logger.warning(f"Failed to copy indexes for {col_name}: {e}")

        src_count = await src_col.count_documents({})
        target_count = await target_col.count_documents({})
        summary[col_name] = {
            "source_count": src_count,
            "backup_count": target_count,
            "duration": round(time.time() - col_start, 2),
            "verified": src_count == target_count
        }

    total_duration = round(time.time() - start_time, 2)
    meta = {
        "backup_date": time.time(),
        "backup_date_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source_database": source_name,
        "target_database": target_name,
        "collections_summary": summary,
        "total_duration_seconds": total_duration
    }
    await target_db["_backup_metadata"].insert_one(meta)
    logger.info(f"Database clone to '{target_name}' completed in {total_duration}s.")
    return meta

async def run_backup(output_dir: str = "./backups", exclude_threats: bool = True):
    """
    Subprocess mongodump wrapper for local filesystem backups when mongodump is available.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(output_dir, f"backup_{timestamp}")

    cmd = [
        "mongodump",
        f"--uri={MONGO_URI}",
        f"--db={MONGO_DB_NAME}",
        f"--out={backup_path}"
    ]

    if exclude_threats:
        cmd.append(f"--excludeCollection=threats")

    logger.info(f"Starting database backup to {backup_path}...")
    
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            logger.info(f"Backup completed successfully: {backup_path}")
            return backup_path
        else:
            logger.error(f"Backup failed with return code {process.returncode}")
            return None
    except FileNotFoundError:
        logger.error("mongodump executable not found on system PATH. Use clone_database_on_atlas() for cloud database backups.")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during backup: {e}")
        return None

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv("backend/.env")
    asyncio.run(clone_database_on_atlas())
