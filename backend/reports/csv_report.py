import io
import csv
from typing import AsyncGenerator, Dict, Any, List
from backend.auth.roles import Role
from backend.reports.templates import get_template

async def stream_csv_report(role: Role, data_cursor: AsyncGenerator[Dict[str, Any], None]) -> AsyncGenerator[str, None]:
    """
    Implements streaming export for large datasets.
    Accepts an async generator of records (e.g. from MongoDB cursor) and yields CSV row strings.
    This entirely avoids loading millions of records into memory at once.
    """
    template = get_template(role)
    
    # We use StringIO to format a single line using the csv module, then yield it
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    
    # Determine headers based on role scoping
    if template.INCLUDE_RAW_LOGS:
        headers = ["timestamp", "severity", "src_ip", "dst_ip", "verdict"]
    else:
        # Scrubbed headers for Viewer
        headers = ["date", "severity", "status"]
        
    writer.writerow(headers)
    yield buffer.getvalue()
    buffer.truncate(0)
    buffer.seek(0)
    
    # Process cursor stream
    async for record in data_cursor:
        if template.INCLUDE_RAW_LOGS:
            row = [
                record.get("timestamp"),
                record.get("severity"),
                record.get("src_ip"),
                record.get("dst_ip"),
                template.format_verdict(record.get("verdict", False))
            ]
        else:
            row = [
                record.get("timestamp"), # In real impl, format to generic Date
                record.get("severity"),
                template.format_verdict(record.get("verdict", False))
            ]
            
        writer.writerow(row)
        yield buffer.getvalue()
        buffer.truncate(0)
        buffer.seek(0)
