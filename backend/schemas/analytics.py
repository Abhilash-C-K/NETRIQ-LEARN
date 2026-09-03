from pydantic import BaseModel
from typing import List, Optional

class TimeRangeQuery(BaseModel):
    start_time: Optional[float] = None
    end_time: Optional[float] = None

class DataPoint(BaseModel):
    timestamp: float
    value: float

class TrendSeries(BaseModel):
    series_name: str
    data: List[DataPoint]
