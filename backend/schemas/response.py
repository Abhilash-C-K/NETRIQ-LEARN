from pydantic import BaseModel
from typing import Optional
from backend.ai.contracts import Action

class ReverseActionReq(BaseModel):
    action: Action
    target_ip: str
    target_mac: Optional[str] = None

class QuarantineActionReq(BaseModel):
    target_ip: str
    target_mac: Optional[str] = None
    reason: Optional[str] = "Manual quarantine triggered by SOC operator"

class MessageResponse(BaseModel):
    message: str
    success: bool = True

