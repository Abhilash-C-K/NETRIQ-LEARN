import os
import asyncio
from datetime import datetime
from backend.utils.logger import get_logger

logger = get_logger(__name__)

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB", "netriq_db")

async def run_backup(output_dir: str = "./backups", exclude_threats: bool = True):
    """
    Runs mongodump via subprocess to backup the database.
    By default, EXCLUDES ephemeral collections like 'threats' to save space.
    INCLUDES permanent records: incidents, users, responses, feedback, reports, settings.
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = os.path.join(output_dir, f"backup_{timestamp}")

    # Build mongodump command
    cmd = [
        "mongodump",
        f"--uri={MONGO_URI}",
        f"--db={MONGO_DB_NAME}",
        f"--out={backup_path}"
    ]

    # Exclude high-volume ephemeral data
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
            logger.error(f"Stderr: {stderr.decode()}")
            return None
    except FileNotFoundError:
        logger.error("mongodump executable not found. Ensure MongoDB tools are installed.")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during backup: {e}")
        return None
