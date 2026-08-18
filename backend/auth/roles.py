from enum import Enum

class Role(str, Enum):
    ADMIN = "admin"
    ANALYST = "analyst"
    VIEWER = "viewer"

class Capabilities(str, Enum):
    VIEW_SMART_SUMMARY = "VIEW_SMART_SUMMARY"
    VIEW_RAW_LOGS = "VIEW_RAW_LOGS"
    REVERSE_RESPONSE_ACTION = "REVERSE_RESPONSE_ACTION"
    TRIGGER_QUARANTINE = "TRIGGER_QUARANTINE"
    MANAGE_USERS = "MANAGE_USERS"
    MANAGE_SETTINGS = "MANAGE_SETTINGS"

# The structured permission matrix matching the blueprint specifications.
# Defines exactly what each role is authorized to do at the API layer.
PERMISSION_MATRIX = {
    Role.ADMIN: [
        Capabilities.VIEW_SMART_SUMMARY,
        Capabilities.VIEW_RAW_LOGS,
        Capabilities.REVERSE_RESPONSE_ACTION,
        Capabilities.TRIGGER_QUARANTINE,
        Capabilities.MANAGE_USERS,
        Capabilities.MANAGE_SETTINGS
    ],
    Role.ANALYST: [
        Capabilities.VIEW_SMART_SUMMARY,
        Capabilities.VIEW_RAW_LOGS,
        Capabilities.REVERSE_RESPONSE_ACTION,
        Capabilities.TRIGGER_QUARANTINE
        # Analysts cannot manage users or settings
    ],
    Role.VIEWER: [
        Capabilities.VIEW_SMART_SUMMARY
        # Viewers can only access the high-level dashboard summaries
    ]
}

def get_request_role(request) -> Role:
    """Extracts user role from request.state, falling back to Role.VIEWER."""
    user = getattr(request.state, "user", None) or {}
    role_val = user.get("role", "")
    return Role(role_val) if role_val in Role._value2member_map_ else Role.VIEWER
