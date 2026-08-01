from pydantic import BaseModel

class MonitorStatus(BaseModel):
    is_running: bool
    mode: str
    uptime_seconds: float = 0.0
    packets_processed: int = 0
