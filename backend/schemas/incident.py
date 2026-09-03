from pydantic import BaseModel
from typing import List, Optional

class IncidentItem(BaseModel):
    id: str
    status: str
    severity: str
    description: str
    created_at: float
    updated_at: Optional[float] = None
    affected_assets: Optional[List[str]] = None
    response_action: Optional[str] = None
    response_success: Optional[bool] = None
    notes: Optional[str] = None

class IncidentUpdateReq(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None

