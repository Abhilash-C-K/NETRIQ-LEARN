"""
Custom exceptions for the NetrIQ system.
"""

class ModelLoadError(Exception):
    """Raised when models, scalers, or encoders fail to load, or metadata is invalid/missing."""
    pass

class PredictionError(Exception):
    """Raised when an error occurs during inference (e.g., model routing or execution failure)."""
    pass

class FeatureEncodingError(Exception):
    """Raised when feature encoding fails and cannot be recovered."""
    pass
