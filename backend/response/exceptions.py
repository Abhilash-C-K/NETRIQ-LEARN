"""
Custom exceptions for the NetrIQ Response module.
"""

class FirewallUnreachableError(Exception):
    """Raised when the external firewall API is unreachable or times out."""
    pass

class FirewallApiError(Exception):
    """Raised when the firewall API returns an error response (e.g., 4xx, 5xx)."""
    pass

class QuarantineFailedError(Exception):
    """Raised when the SDN/agent quarantine operation fails."""
    pass

class SandboxRoutingError(Exception):
    """Raised when traffic routing to the sandbox fails."""
    pass
