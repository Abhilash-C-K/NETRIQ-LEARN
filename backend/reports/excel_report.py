import io
from typing import List, Dict, Any, Optional
from backend.auth.roles import Role
from backend.reports.templates import get_template
from backend.reports.charts import generate_bar_chart
try:
    from openpyxl import Workbook
    from openpyxl.drawing.image import Image as ExcelImage
except ImportError:
    Workbook = None
    ExcelImage = None

async def generate_excel_report(role: Role, data: List[Dict[str, Any]], chart_data: Optional[List[Dict[str, Any]]] = None) -> io.BytesIO:
    """
    Generates an Excel workbook with embedded matplotlib charts.
    """
    buffer = io.BytesIO()
    
    if not Workbook:
        buffer.write(b"Excel Generation requires openpyxl. pip install openpyxl")
        buffer.seek(0)
        return buffer
        
    template = get_template(role)
    wb = Workbook()
    if wb is None or ExcelImage is None:
        buffer.write(b"Excel Generation requires openpyxl. pip install openpyxl")
        buffer.seek(0)
        return buffer

    # Sheet 1: Data
    ws_data = wb.active
    if ws_data is None:
        return buffer
    ws_data.title = "Threat Data"
    
    if template.INCLUDE_RAW_LOGS:
        headers = ["timestamp", "severity", "src_ip", "dst_ip", "verdict"]
    else:
        headers = ["date", "severity", "status"]
        
    ws_data.append(headers)
    
    for item in data:
        if template.INCLUDE_RAW_LOGS:
            row = [
                item.get("timestamp"),
                item.get("severity"),
                item.get("src_ip"),
                item.get("dst_ip"),
                template.format_verdict(item.get("verdict", False))
            ]
        else:
            row = [
                item.get("timestamp"),
                item.get("severity"),
                template.format_verdict(item.get("verdict", False))
            ]
        ws_data.append(row)
        
    # Sheet 2: Trends Chart
    if chart_data:
        ws_charts = wb.create_sheet(title="Trends")
        chart_buffer = await generate_bar_chart(chart_data, "Threat Distribution")
        
        # Insert image into Excel
        img = ExcelImage(chart_buffer)
        ws_charts.add_image(img, "B2")
        
    wb.save(buffer)
    buffer.seek(0)
    return buffer
