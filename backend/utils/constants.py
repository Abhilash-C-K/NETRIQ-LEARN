from enum import Enum

class Role(str, Enum):
    VIEWER = "viewer"
    ANALYST = "analyst"
    ADMIN = "admin"

class ActionType(str, Enum):
    NOTIFY = "notify"
    RECOMMEND_BLOCK = "recommend_block"
    QUARANTINE = "quarantine"
    REVERSE_ACTION = "reverse_action"

class RiskCategory(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class EventType(str, Enum):
    LIVE_VERDICT = "live_verdict"
    QUARANTINE_ACTION = "quarantine_action"
    MONITOR_STATUS = "monitor_status"
    NEW_INCIDENT = "new_incident"
