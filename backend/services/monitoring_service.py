import asyncio
import time
import threading
from typing import Dict, Any, Optional
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
        self._active_neighbors: Dict[str, Dict[str, Any]] = {}
        self._last_subnet_sweep: float = 0.0
        self._sweep_in_progress: bool = False
        self._sweep_lock = threading.Lock()

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

    def _run_subnet_sweep(self, host_ip: str, gateway_ip: Optional[str]) -> None:
        """
        Actively probes the entire local Wi-Fi subnet in parallel using Win32 SendARP.
        Discovers all connected physical systems, smartphones, and routers on the LAN.
        """
        import ctypes
        import struct
        import socket
        from concurrent.futures import ThreadPoolExecutor

        def win_send_arp(ip_str: str):
            try:
                dest_ip = socket.inet_aton(ip_str)
                dest_ip_le = struct.unpack('<I', dest_ip)[0]
                mac_buf = (ctypes.c_byte * 6)()
                mac_len = ctypes.c_ulong(6)
                res = ctypes.windll.iphlpapi.SendARP(
                    ctypes.c_ulong(dest_ip_le),
                    ctypes.c_ulong(0),
                    ctypes.byref(mac_buf),
                    ctypes.byref(mac_len)
                )
                if res == 0:
                    mac = ':'.join(f'{b & 0xff:02X}' for b in mac_buf)
                    return ip_str, mac
            except Exception:
                pass
            return ip_str, None

        try:
            base_parts = host_ip.split('.')[:3]
            base = '.'.join(base_parts) + '.'
            all_ips = [f"{base}{i}" for i in range(1, 255)]

            with ThreadPoolExecutor(max_workers=128) as pool:
                results = list(pool.map(win_send_arp, all_ips))

            from backend.services.dns_resolver import dns_resolver

            new_neighbors = {}
            for ip, mac in results:
                if not mac:
                    continue
                if ip in (host_ip, gateway_ip):
                    continue

                resolved_name = dns_resolver.resolve_ip_sync(ip, timeout=0.1)
                last_octet = ip.split('.')[-1]
                hostname = resolved_name or f"Device-{last_octet}"

                new_neighbors[ip] = {
                    "ip": ip,
                    "hostname": hostname,
                    "label": f"{resolved_name} ({ip})" if resolved_name else f"Connected Device ({ip})",
                    "type": "workstation",
                    "is_host": False,
                    "is_gateway": False,
                    "mac": mac,
                    "status": "NORMAL",
                }

            with self._sweep_lock:
                self._active_neighbors.update(new_neighbors)
                self._last_subnet_sweep = time.time()
                self._sweep_in_progress = False

        except Exception as e:
            logger.debug(f"Active subnet sweep encountered error: {e}")
            with self._sweep_lock:
                self._sweep_in_progress = False

    def get_local_topology(self) -> Dict[str, Any]:
        """
        Discovers real host IP, default gateway, and all active devices on the local Wi-Fi network.
        Combines immediate OS ARP table with non-blocking active subnet sweeps.
        """
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

        # Trigger background active subnet sweep if not recently run
        now = time.time()
        with self._sweep_lock:
            if (now - self._last_subnet_sweep > 25) and not self._sweep_in_progress:
                self._sweep_in_progress = True
                threading.Thread(target=self._run_subnet_sweep, args=(host_ip, gateway_ip), daemon=True).start()

        devices = []
        hostname = "Host-PC"
        try:
            hostname = socket.gethostname()
        except Exception:
            pass

        # Add Host Device with resolved system name
        devices.append({
            "ip": host_ip,
            "hostname": hostname,
            "label": f"{hostname} (Host PC)",
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
                "hostname": "Wi-Fi Router Gateway",
                "label": f"Wi-Fi Router Gateway ({gateway_ip})",
                "type": "router",
                "is_host": False,
                "is_gateway": True,
                "mac": "Default Gateway",
                "status": "NORMAL",
            })

        seen_ips = {host_ip}
        if gateway_ip:
            seen_ips.add(gateway_ip)

        # 3. Read immediate OS ARP neighbors
        try:
            arp_out = subprocess.check_output(["arp", "-a"], text=True)
            for line in arp_out.splitlines():
                m = re.search(r"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+(\w+)", line)
                if m:
                    ip, mac, typ = m.groups()
                    if ip in seen_ips:
                        if ip == gateway_ip:
                            for d in devices:
                                if d["ip"] == gateway_ip:
                                    d["mac"] = mac.replace("-", ":").upper()
                        continue
                    if ip.startswith("224.") or ip.startswith("239.") or ip.endswith(".255") or ip.endswith(".0"):
                        continue

                    seen_ips.add(ip)
                    last_octet = ip.split('.')[-1]
                    device_hostname = f"Device-{last_octet}"
                    devices.append({
                        "ip": ip,
                        "hostname": device_hostname,
                        "label": f"Connected Device ({ip})",
                        "type": "workstation",
                        "is_host": False,
                        "is_gateway": False,
                        "mac": mac.replace("-", ":").upper(),
                        "status": "NORMAL",
                    })
        except Exception as e:
            logger.debug(f"Could not query ARP table: {e}")

        # 4. Merge all active devices discovered by subnet sweep
        with self._sweep_lock:
            for ip, dev_info in self._active_neighbors.items():
                if ip not in seen_ips:
                    seen_ips.add(ip)
                    devices.append(dev_info)
                else:
                    # Update MAC or hostname if richer info found
                    for d in devices:
                        if d["ip"] == ip:
                            if dev_info.get("mac") and d["mac"] in ("00:00:00:00:00:00", "Default Gateway", "Local Host Interface"):
                                d["mac"] = dev_info["mac"]
                            if dev_info.get("hostname") and not d["hostname"].startswith("Device-"):
                                d["hostname"] = dev_info["hostname"]
                                d["label"] = dev_info["label"]

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

