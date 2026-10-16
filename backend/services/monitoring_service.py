import asyncio
import time
from typing import Dict, Any
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.websocket.broadcaster import broadcaster
from backend.websocket.events import MonitorStatusEvent
from backend.live_monitor.monitor_service import monitor_service as live_monitor

logger = get_logger(__name__)


class MonitoringService:
    def __init__(self):
        self._is_running = False
        self._start_time: float = 0.0
        self._lock: asyncio.Lock | None = None

    @property
    def lock(self) -> asyncio.Lock:
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def get_status(self) -> Dict[str, Any]:
        """Returns current monitoring status as a dictionary with operational telemetry counters."""
        uptime = (time.time() - self._start_time) if self._is_running else 0.0
        
        # Pull live operational metrics from PacketSniffer instance
        sniffer = getattr(live_monitor, "sniffer", None)
        queue_drop_count = getattr(sniffer, "queue_drop_count", 0) if sniffer else 0
        non_ip_count = getattr(sniffer, "non_ip_count", 0) if sniffer else 0
        malformed_ip_count = getattr(sniffer, "malformed_ip_count", 0) if sniffer else 0
        
        interface = getattr(live_monitor, "interface", None)
        
        flow_builder = getattr(live_monitor, "flow_builder", None)
        active_flows = len(flow_builder.active_flows) if flow_builder and hasattr(flow_builder, "active_flows") else 0

        op_metrics = {
            "queue_drop_count": queue_drop_count,
            "non_ip_count": non_ip_count,
            "malformed_ip_count": malformed_ip_count
        }

        return {
            "is_running": self._is_running,
            "mode": "active" if self._is_running else "stopped",
            "interface": interface or "Default (Auto-select)",
            "uptime_seconds": round(uptime, 2),
            "packets_captured": getattr(sniffer, "packets_captured", 0) if hasattr(sniffer, "packets_captured") else 0,
            "flows_processed": getattr(live_monitor, "flows_processed", 0) if hasattr(live_monitor, "flows_processed") else 0,
            "active_flows": active_flows,
            "operational_metrics": op_metrics,
            "metrics": op_metrics
        }

    async def start(self, role: Role) -> bool:
        """Starts the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if self._is_running:
                logger.info("Monitoring already running.")
                return True

            try:
                await live_monitor.start()
                self._is_running = True
                self._start_time = time.time()
                logger.info("Live Monitoring Pipeline Started.")

                event = MonitorStatusEvent(payload={"status": "started", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
                return True
            except Exception as e:
                self._is_running = False
                self._start_time = 0.0
                logger.error(f"Failed to start live monitor: {e}", exc_info=True)
                raise

    def get_local_topology(self) -> Dict[str, Any]:
        """Discovers real host IP, default gateway, and connected ARP neighbors on the active local network."""
        import socket
        import subprocess
        import re

        host_ip = "127.0.0.1"
        gateway_ip = None

        # 1. Discover host IP via active socket
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            host_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        # 2. Discover default gateway via route print
        try:
            out = subprocess.check_output(["route", "print", "0.0.0.0"], text=True)
            m = re.search(r"0\.0\.0\.0\s+0\.0\.0\.0\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)", out)
            if m:
                gateway_ip, route_iface = m.groups()
                if not host_ip or host_ip == "127.0.0.1":
                    host_ip = route_iface
        except Exception as e:
            logger.debug(f"Could not determine gateway via route print: {e}")

        devices = []
        # Add Host Device
        devices.append({
            "ip": host_ip,
            "label": f"This PC ({host_ip})",
            "type": "workstation",
            "is_host": True,
            "is_gateway": False,
            "mac": "Local Host Interface",
            "status": "NORMAL",
        })

        # Add Gateway if known
        if gateway_ip and gateway_ip != host_ip:
            devices.append({
                "ip": gateway_ip,
                "label": f"Wi-Fi Router Gateway ({gateway_ip})",
                "type": "router",
                "is_host": False,
                "is_gateway": True,
                "mac": "Default Gateway",
                "status": "NORMAL",
            })

        # 3. Discover real ARP neighbors on the active local subnet
        try:
            arp_out = subprocess.check_output(["arp", "-a"], text=True)
            for line in arp_out.splitlines():
                m = re.search(r"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+(\w+)", line)
                if m:
                    ip, mac, typ = m.groups()
                    if ip in (host_ip, gateway_ip):
                        if ip == gateway_ip:
                            for d in devices:
                                if d["ip"] == gateway_ip:
                                    d["mac"] = mac.replace("-", ":").upper()
                        continue
                    if ip.startswith("224.") or ip.startswith("239.") or ip.endswith(".255") or ip.endswith(".0"):
                        continue
                    host_subnet = ".".join(host_ip.split(".")[:3])
                    if ip.startswith(host_subnet):
                        devices.append({
                            "ip": ip,
                            "label": f"Connected Device ({ip})",
                            "type": "workstation",
                            "is_host": False,
                            "is_gateway": False,
                            "mac": mac.replace("-", ":").upper(),
                            "status": "NORMAL",
                        })
        except Exception as e:
            logger.debug(f"Could not query ARP table: {e}")

        return {
            "host_ip": host_ip,
            "gateway_ip": gateway_ip,
            "subnet": f"{'.'.join(host_ip.split('.')[:3])}.0/24",
            "device_count": len(devices),
            "devices": devices,
        }

    async def stop(self, role: Role) -> bool:
        """Stops the live monitoring pipeline. Idempotent."""
        async with self.lock:
            if not self._is_running:
                logger.info("Monitoring already stopped.")
                return True

            try:
                await live_monitor.stop()
            except Exception as e:
                logger.error(f"Error stopping live monitor: {e}", exc_info=True)
            finally:
                self._is_running = False
                self._start_time = 0.0
                logger.info("Live Monitoring Pipeline Stopped.")

                event = MonitorStatusEvent(payload={"status": "stopped", **self.get_status()})
                res = broadcaster.publish(event)
                if asyncio.iscoroutine(res) or hasattr(res, "__await__"):
                    await res
            return True


monitoring_service = MonitoringService()

