from backend.database.database import DatabaseManager
from backend.database.collections import (
    BaseRepository,
    ThreatRepository,
    threats_repo,
    incidents_repo,
    responses_repo,
    users_repo,
    feedback_repo,
    reports_repo,
    settings_repo
)
from backend.database.indexes import ensure_indexes
from backend.database.backup import run_backup
from backend.database.restore import run_restore
from backend.database.exceptions import (
    DatabaseConnectionError,
    DocumentNotFoundError,
    DuplicateKeyError,
    FatalRestoreError
)

__all__ = [
    "DatabaseManager",
    "BaseRepository",
    "ThreatRepository",
    "threats_repo",
    "incidents_repo",
    "responses_repo",
    "users_repo",
    "feedback_repo",
    "reports_repo",
    "settings_repo",
    "ensure_indexes",
    "run_backup",
    "run_restore",
    "DatabaseConnectionError",
    "DocumentNotFoundError",
    "DuplicateKeyError",
    "FatalRestoreError"
]
