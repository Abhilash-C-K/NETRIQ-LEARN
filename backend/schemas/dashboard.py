from pydantic import BaseModel
from typing import List, Dict, Any

class DashboardSummary(BaseModel):
    total_threats_blocked: int
    active_incidents: int
    system_health: str
    recent_activity: List[Dict[str, Any]]
