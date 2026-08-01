from pydantic import BaseModel
from typing import List, Optional

class IncidentItem(BaseModel):
    id: str
    status: str
    severity: str
    description: str
    created_at: float
    updated_at: float
    affected_assets: List[str]

class IncidentUpdateReq(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
