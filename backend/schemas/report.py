from pydantic import BaseModel
from typing import Optional

class ReportGenerateReq(BaseModel):
    report_type: str = "incident_summary"
    start_time: Optional[float] = None
    end_time: Optional[float] = None
    format: str = "pdf"

class ReportMetadata(BaseModel):
    id: str
    report_type: str
    status: str
    download_url: Optional[str] = None
