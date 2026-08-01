import io
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List
# Matplotlib must be used carefully in async web frameworks.
# Agg backend is strictly non-interactive, preventing thread crashes.
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

# We use a ThreadPoolExecutor so charting doesn't block the async event loop
_chart_pool = ThreadPoolExecutor(max_workers=4)

def _generate_bar_chart_sync(data: List[Dict[str, Any]], title: str) -> io.BytesIO:
    """Synchronous internal function to generate a matplotlib bar chart."""
    fig, ax = plt.subplots(figsize=(6, 4))
    
    # Extract data
    labels = [item.get("label", "Unknown") for item in data]
    values = [item.get("value", 0) for item in data]
    
    # Corporate aesthetic: Dark mode / cybersecurity theme colors
    ax.bar(labels, values, color='#00ff9d') # Neon green
    ax.set_title(title, color='white')
    ax.tick_params(colors='white')
    
    # Dark background styling
    fig.patch.set_facecolor('#1a1a1a')
    ax.set_facecolor('#1a1a1a')
    for spine in ax.spines.values():
        spine.set_color('#444444')
    
    plt.tight_layout()
    
    # Render to buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=100, facecolor=fig.get_facecolor(), edgecolor='none')
    buf.seek(0)
    plt.close(fig)
    return buf

async def generate_bar_chart(data: List[Dict[str, Any]], title: str) -> io.BytesIO:
    """
    Asynchronous wrapper for chart generation.
    Returns a BytesIO buffer containing a PNG image, suitable for embedding 
    into PDF (reportlab) or Excel (openpyxl).
    """
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(_chart_pool, _generate_bar_chart_sync, data, title)
