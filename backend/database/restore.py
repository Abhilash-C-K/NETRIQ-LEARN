import os
import asyncio
from backend.utils.logger import get_logger
from backend.database.exceptions import FatalRestoreError

logger = get_logger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")

async def run_restore(backup_path: str, target_db: str, confirm_prod_overwrite: bool = False):
    """
    Runs mongorestore via subprocess to restore the database.
    Guard: Throws FatalRestoreError if target is the production DB and confirm_prod_overwrite is False.
    """
    if not os.path.exists(backup_path):
        logger.error(f"Backup path does not exist: {backup_path}")
        return False

    prod_db_name = os.getenv("MONGO_DB", "netriq_db")
    
    # Safety Guard
    if target_db == prod_db_name and not confirm_prod_overwrite:
        msg = (
            f"FATAL: Attempted to restore over production database '{target_db}' "
            f"without explicit confirmation."
        )
        logger.critical(msg)
        raise FatalRestoreError(msg)

    # Build mongorestore command
    cmd = [
        "mongorestore",
        f"--uri={MONGO_URI}",
        f"--nsInclude={target_db}.*",
        # Mapping the backup DB namespace to the target DB if they differ
        # Assuming the backup was taken from prod_db_name
        f"--nsFrom={prod_db_name}.*",
        f"--nsTo={target_db}.*",
        "--drop", # Drops collections before restoring
        backup_path
    ]

    logger.info(f"Starting database restore from {backup_path} to {target_db}...")
    
    try:
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        stdout, stderr = await process.communicate()

        if process.returncode == 0:
            logger.info(f"Restore completed successfully to {target_db}.")
            return True
        else:
            logger.error(f"Restore failed with return code {process.returncode}")
            logger.error(f"Stderr: {stderr.decode()}")
            return False
    except FileNotFoundError:
        logger.error("mongorestore executable not found. Ensure MongoDB tools are installed.")
        return False
    except Exception as e:
        logger.error(f"Unexpected error during restore: {e}")
        return False
