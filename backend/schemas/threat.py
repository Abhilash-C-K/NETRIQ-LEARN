from pydantic import BaseModel, Field
from typing import Optional, Any, Dict

class LogQuery(BaseModel):
    limit: int = 50
    offset: int = 0
    severity: Optional[str] = None
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    src_ip: Optional[str] = None

class RawLog(BaseModel):
    id: Optional[str] = None
    timestamp: float
    src_ip: str
    dst_ip: str
    src_port: Optional[int] = 0
    dst_port: Optional[int] = 0
    protocol: Optional[str] = "TCP"
    sni: Optional[str] = None
    prediction: Optional[str] = "BENIGN"
    confidence: Optional[float] = 0.0
    severity: str
    action: Optional[str] = "NOTIFY"
    action_taken: Optional[str] = None
    is_anomaly: Optional[bool] = False
    is_internal: Optional[bool] = False
    raw_data: Optional[Dict[str, Any]] = None

    def model_post_init(self, __context: Any) -> None:
        if self.action_taken is None and self.action is not None:
            self.action_taken = self.action
        elif self.action is None and self.action_taken is not None:
            self.action = self.action_taken

    class Config:
        extra = "allow"
