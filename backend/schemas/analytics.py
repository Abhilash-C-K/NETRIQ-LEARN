from pydantic import BaseModel
from typing import List

class TimeRangeQuery(BaseModel):
    start_time: float
    end_time: float

class DataPoint(BaseModel):
    timestamp: float
    value: float

class TrendSeries(BaseModel):
    series_name: str
    data: List[DataPoint]
