from pydantic import BaseModel
from typing import List, Optional

class IncidentItem(BaseModel):
    id: str
    incident_code: Optional[str] = None
    status: str
    severity: str
    description: str
    created_at: float
    updated_at: Optional[float] = None
    affected_assets: Optional[List[str]] = None
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None
    src_port: Optional[int] = None
    dst_port: Optional[int] = None
    protocol: Optional[str] = None
    confidence: Optional[float] = None
    bytes_transferred: Optional[int] = None
    packets_transferred: Optional[int] = None
    source_label: Optional[str] = None
    target_label: Optional[str] = None
    response_action: Optional[str] = None
    response_success: Optional[bool] = None
    notes: Optional[str] = None

class IncidentUpdateReq(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


