from typing import Optional
from pydantic import BaseModel, Field

class OperationalMetrics(BaseModel):
    queue_drop_count: int = Field(default=0, description="Packets dropped due to queue overflow")
    non_ip_count: int = Field(default=0, description="Non-IPv4/IPv6 packets filtered")
    malformed_ip_count: int = Field(default=0, description="Malformed packets routed to HeuristicFallback")

class MonitorStatusResponse(BaseModel):
    is_running: bool = Field(description="True if sniffer loop is actively capturing")
    interface: Optional[str] = Field(default=None, description="Active capture interface name")
    uptime_seconds: float = Field(default=0.0, description="Monitor loop uptime in seconds")
    packets_captured: int = Field(default=0, description="Total packets captured off the wire")
    flows_processed: int = Field(default=0, description="Total flows processed through feature extraction")
    active_flows: int = Field(default=0, description="Currently active flows in FlowBuilder window")
    operational_metrics: OperationalMetrics = Field(default_factory=OperationalMetrics, description="Live operational sniffer counters")

class MonitorStatus(MonitorStatusResponse):
    """Backward compatibility alias for MonitorStatusResponse."""
    mode: str = Field(default="live", description="Monitoring mode")
