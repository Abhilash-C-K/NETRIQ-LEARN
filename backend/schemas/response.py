from pydantic import BaseModel
from typing import Optional
from backend.ai.contracts import Action

class ReverseActionReq(BaseModel):
    action: Action
    target_ip: str
    target_mac: Optional[str] = None

class MessageResponse(BaseModel):
    message: str
    success: bool = True
