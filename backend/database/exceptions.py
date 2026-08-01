"""
Custom exceptions for the NetrIQ Database module.
"""

class DatabaseConnectionError(Exception):
    """Raised when the database connection fails after retries."""
    pass

class DocumentNotFoundError(Exception):
    """Raised when a requested document does not exist."""
    pass

class DuplicateKeyError(Exception):
    """Raised when attempting to insert a document with an existing unique key."""
    pass

class FatalRestoreError(Exception):
    """Raised when a dangerous restore operation is attempted without confirmation."""
    pass
