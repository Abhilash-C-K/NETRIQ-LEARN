from pydantic import BaseModel
from typing import Optional, Any, Dict

class LogQuery(BaseModel):
    limit: int = 50
    offset: int = 0
    severity: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None

class RawLog(BaseModel):
    id: str
    timestamp: float
    src_ip: str
    dst_ip: str
    severity: str
    action_taken: str
    raw_data: Dict[str, Any]
