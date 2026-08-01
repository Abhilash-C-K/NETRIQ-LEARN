import io
from typing import List, Dict, Any
from backend.auth.roles import Role
from backend.reports.templates import get_template
from backend.reports.charts import generate_bar_chart
# reportlab requires installation
try:
    from reportlab.pdfgen import canvas
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.utils import ImageReader
except ImportError:
    canvas = None
    letter = None
    ImageReader = None

async def generate_pdf_report(role: Role, data: List[Dict[str, Any]], chart_data: List[Dict[str, Any]] = None) -> io.BytesIO:
    """
    Generates a PDF report using reportlab.
    Embeds charts generated via matplotlib.
    """
    buffer = io.BytesIO()
    
    if not canvas:
        # Fallback if reportlab isn't installed
        buffer.write(b"PDF Generation requires reportlab. pip install reportlab")
        buffer.seek(0)
        return buffer
        
    template = get_template(role)
    c = canvas.Canvas(buffer, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, 750, template.TITLE)
    
    # Chart
    if chart_data:
        chart_buffer = await generate_bar_chart(chart_data, "Threat Distribution")
        img = ImageReader(chart_buffer)
        c.drawImage(img, 50, 450, width=400, height=250)
        
    # Data Table (Stubbed simplified text output for blueprint)
    c.setFont("Helvetica", 12)
    y = 400
    for item in data[:10]: # Limit to 10 for simple PDF
        if template.INCLUDE_RAW_LOGS:
            line = f"{item.get('src_ip')} -> {item.get('dst_ip')} : {template.format_verdict(item.get('verdict', False))}"
        else:
            line = f"Incident logged at {item.get('timestamp')}: {template.format_verdict(item.get('verdict', False))}"
            
        c.drawString(50, y, line)
        y -= 20
        if y < 50:
            break
            
    c.save()
    buffer.seek(0)
    return buffer
