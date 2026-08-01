from pydantic import BaseModel
from typing import Optional

class ReportGenerateReq(BaseModel):
    report_type: str
    start_time: float
    end_time: float
    format: str = "pdf"

class ReportMetadata(BaseModel):
    id: str
    report_type: str
    status: str
    download_url: Optional[str] = None
