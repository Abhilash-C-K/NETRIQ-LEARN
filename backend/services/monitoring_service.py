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
        
        # Prime active subnet cache immediately in background thread
        try:
            h_ip, gw_ip = self._get_network_endpoints()
            self._sweep_in_progress = True
            threading.Thread(target=self._run_subnet_sweep, args=(h_ip, gw_ip), daemon=True).start()
        except Exception:
            pass

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

    def _get_network_endpoints(self) -> tuple[str, Optional[str]]:
        """Discovers real host IP and default gateway IP without hardcoded defaults."""
        import socket
        import subprocess
        import re

        host_ip = "127.0.0.1"
        gateway_ip = None

        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            host_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        try:
            out = subprocess.check_output(["route", "print", "0.0.0.0"], text=True)
            m = re.search(r"0\.0\.0\.0\s+0\.0\.0\.0\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)", out)
            if m:
                gateway_ip, route_iface = m.groups()
                if not host_ip or host_ip == "127.0.0.1":
                    host_ip = route_iface
        except Exception as e:
            logger.debug(f"Could not determine gateway via route print: {e}")

        return host_ip, gateway_ip

    def _run_subnet_sweep(self, host_ip: str, gateway_ip: Optional[str]) -> None:
        """
        Actively probes the entire local Wi-Fi subnet in parallel using Win32 SendARP.
        Discovers all connected physical systems, smartphones, and routers on the LAN.
        Queries the Wi-Fi router's DNS server directly for exact registered hostnames.
        Prunes disconnected devices dynamically.
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

            # 1. Probe local subnet with Win32 SendARP in parallel
            with ThreadPoolExecutor(max_workers=96) as pool:
                arp_tuples = list(pool.map(win_send_arp, all_ips))
            arp_map = {ip: mac for ip, mac in arp_tuples if mac}

            # 2. Check local OS ARP cache (catches sleeping devices that Windows communicated with)
            try:
                import subprocess, re
                arp_out = subprocess.check_output("arp -a", shell=True, text=True, stderr=subprocess.DEVNULL)
                for line in arp_out.splitlines():
                    m = re.search(rf"({re.escape(base)}\d+)\s+([0-9a-fA-F\-]{{17}})", line)
                    if m:
                        a_ip = m.group(1)
                        a_mac = m.group(2).replace('-', ':').upper()
                        if a_ip not in arp_map and not a_mac.startswith("FF:FF:FF"):
                            arp_map[a_ip] = a_mac
            except Exception:
                pass

            # 3. Concurrently query router DNS PTR for all IPs (discovers all registered DHCP leases)
            dns_names = {}
            if gateway_ip:
                import dns.resolver, dns.reversename
                router_res = dns.resolver.Resolver()
                router_res.nameservers = [gateway_ip]
                router_res.timeout = 0.35
                router_res.lifetime = 0.35

                def resolve_ptr(ip_str: str):
                    try:
                        rev = dns.reversename.from_address(ip_str)
                        ans = router_res.resolve(rev, "PTR")
                        if ans:
                            raw = str(ans[0]).rstrip(".")
                            for suff in [".domain.name", ".lan", ".home", ".local", ".corp"]:
                                if raw.lower().endswith(suff):
                                    raw = raw[:-len(suff)]
                            clean = raw.replace("-", " ").strip()
                            if clean and not clean.endswith(".in-addr.arpa"):
                                return ip_str, clean
                    except Exception:
                        pass
                    return ip_str, None

                with ThreadPoolExecutor(max_workers=64) as pool:
                    ptr_results = pool.map(resolve_ptr, all_ips)
                    for ip_str, name in ptr_results:
                        if name:
                            dns_names[ip_str] = name

            # 4. Combine discovered IPs: responding to ARP OR registered in router DHCP table
            candidate_ips = set(arp_map.keys()) | set(dns_names.keys())

            new_neighbors = {}
            for ip in candidate_ips:
                if ip in (host_ip, gateway_ip):
                    continue

                mac = arp_map.get(ip)
                # If MAC not in instant ARP, check if we had it in previous cache
                if not mac:
                    prev = self._active_neighbors.get(ip)
                    if prev and prev.get("mac"):
                        mac = prev["mac"]
                    else:
                        mac = "00:00:00:00:00:00"

                hostname = dns_names.get(ip)

                # Check if randomized MAC (smartphones) or workstation
                last_octet = ip.split('.')[-1]
                is_random_mac = False
                try:
                    is_random_mac = (int(mac.split(':')[0], 16) & 2) != 0
                except Exception:
                    pass

                if not hostname:
                    if is_random_mac:
                        hostname = f"Smartphone ({last_octet})"
                    else:
                        hostname = f"Workstation ({last_octet})"
                elif hostname.lower() == "p110":
                    hostname = "Tapo Smart Plug (P110)"

                # Determine device type
                dev_type = "workstation"
                h_lower = hostname.lower()
                if "router" in h_lower or "gateway" in h_lower or "gw" in h_lower:
                    dev_type = "router"
                elif "plug" in h_lower or "p110" in h_lower or "iot" in h_lower or "cam" in h_lower or "smart" in h_lower:
                    dev_type = "server"
                elif is_random_mac or any(k in h_lower for k in ["phone", "m21", "galaxy", "realme", "xiaomi", "redmi", "iphone", "pixel", "infinix"]):
                    dev_type = "workstation"

                new_neighbors[ip] = {
                    "ip": ip,
                    "hostname": hostname,
                    "label": f"{hostname} ({ip})",
                    "type": dev_type,
                    "is_host": False,
                    "is_gateway": False,
                    "mac": mac,
                    "status": "NORMAL",
                }

            with self._sweep_lock:
                self._active_neighbors = new_neighbors
                self._last_subnet_sweep = time.time()
                self._sweep_in_progress = False
                logger.info(f"Subnet sweep completed: {len(new_neighbors)} verified devices discovered on {base}0/24.")

        except Exception as e:
            logger.warning(f"Active subnet sweep encountered error: {e}")
            with self._sweep_lock:
                self._sweep_in_progress = False

    def get_local_topology(self) -> Dict[str, Any]:
        """
        Discovers real host IP, default gateway, and all active devices on the local Wi-Fi network.
        Filters strictly by active subnet to eliminate phantom IPs from WSL/Hyper-V/VirtualBox.
        Uses verified active neighbor cache with background refreshing.
        """
        import socket
        import subprocess
        import re

        host_ip, gateway_ip = self._get_network_endpoints()
        base_prefix = '.'.join(host_ip.split('.')[:3]) + '.'

        # Trigger background active subnet sweep if cache is older than 25s or empty
        now = time.time()
        with self._sweep_lock:
            needs_sweep = (now - self._last_subnet_sweep > 25) or (len(self._active_neighbors) == 0)
            if needs_sweep and not self._sweep_in_progress:
                self._sweep_in_progress = True
                threading.Thread(target=self._run_subnet_sweep, args=(host_ip, gateway_ip), daemon=True).start()

        devices = []
        hostname = "Host-PC"
        try:
            hostname = socket.gethostname()
        except Exception:
            pass

        # 1. Add Host Device with resolved system name
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

        # 2. Add Gateway if known
        gateway_mac = "Default Gateway"
        if gateway_ip and gateway_ip != host_ip:
            try:
                arp_out = subprocess.check_output(["arp", "-a", gateway_ip], text=True)
                m = re.search(r"([0-9a-fA-F-]{17})", arp_out)
                if m:
                    gateway_mac = m.group(1).replace("-", ":").upper()
            except Exception:
                pass

            devices.append({
                "ip": gateway_ip,
                "hostname": "Wi-Fi Router Gateway",
                "label": f"Wi-Fi Router Gateway ({gateway_ip})",
                "type": "router",
                "is_host": False,
                "is_gateway": True,
                "mac": gateway_mac,
                "status": "NORMAL",
            })

        seen_ips = {host_ip}
        if gateway_ip:
            seen_ips.add(gateway_ip)

        # 3. Merge verified active neighbors from subnet sweep
        with self._sweep_lock:
            cached_neighbors = dict(self._active_neighbors)

        for ip, dev_info in cached_neighbors.items():
            if ip not in seen_ips and ip.startswith(base_prefix):
                seen_ips.add(ip)
                devices.append(dev_info)

        # 4. If cache was empty, supplement with immediate OS ARP table filtered STRICTLY to active subnet prefix
        if len(devices) <= 2:
            try:
                import ctypes, struct
                def fast_arp_check(ip_str):
                    try:
                        dest_ip = socket.inet_aton(ip_str)
                        dest_ip_le = struct.unpack('<I', dest_ip)[0]
                        mac_buf = (ctypes.c_byte * 6)()
                        mac_len = ctypes.c_ulong(6)
                        res = ctypes.windll.iphlpapi.SendARP(ctypes.c_ulong(dest_ip_le), ctypes.c_ulong(0), ctypes.byref(mac_buf), ctypes.byref(mac_len))
                        if res == 0:
                            return ':'.join(f'{b & 0xff:02X}' for b in mac_buf)
                    except Exception:
                        pass
                    return None

                arp_out = subprocess.check_output(["arp", "-a"], text=True)
                for line in arp_out.splitlines():
                    m = re.search(r"([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)\s+([0-9a-fA-F-]+)\s+(\w+)", line)
                    if m:
                        ip, mac_raw, typ = m.groups()
                        # STRICT FILTER: must be on active Wi-Fi subnet!
                        if not ip.startswith(base_prefix):
                            continue
                        if ip in seen_ips:
                            continue
                        if ip.endswith(".255") or ip.endswith(".0"):
                            continue

                        real_mac = fast_arp_check(ip)
                        if not real_mac:
                            continue

                        seen_ips.add(ip)
                        formatted_mac = real_mac or mac_raw.replace("-", ":").upper()
                        is_random = False
                        try:
                            is_random = (int(formatted_mac.split(':')[0], 16) & 2) != 0
                        except Exception:
                            pass

                        dev_name = None
                        try:
                            import dns.resolver, dns.reversename
                            router_res = dns.resolver.Resolver()
                            if gateway_ip:
                                router_res.nameservers = [gateway_ip]
                            router_res.timeout = 0.3
                            router_res.lifetime = 0.3
                            rev = dns.reversename.from_address(ip)
                            ans = router_res.resolve(rev, "PTR")
                            if ans:
                                raw = str(ans[0]).rstrip(".")
                                for suff in [".domain.name", ".lan", ".home", ".local", ".corp"]:
                                    if raw.lower().endswith(suff):
                                        raw = raw[:-len(suff)]
                                clean_name = raw.replace("-", " ").strip()
                                if clean_name and not clean_name.endswith(".in-addr.arpa"):
                                    dev_name = clean_name
                        except Exception:
                            pass

                        last_octet = ip.split('.')[-1]
                        if not dev_name:
                            dev_name = f"Smartphone ({last_octet})" if is_random else f"Workstation ({last_octet})"

                        dev_type = "workstation"
                        h_lower = dev_name.lower()
                        if "router" in h_lower or "gateway" in h_lower or "gw" in h_lower:
                            dev_type = "router"
                        elif "plug" in h_lower or "p110" in h_lower or "iot" in h_lower or "cam" in h_lower or "smart" in h_lower:
                            dev_type = "server"

                        devices.append({
                            "ip": ip,
                            "hostname": dev_name,
                            "label": f"{dev_name} ({ip})",
                            "type": dev_type,
                            "is_host": False,
                            "is_gateway": False,
                            "mac": formatted_mac,
                            "status": "NORMAL",
                        })
            except Exception as e:
                logger.debug(f"Could not query immediate ARP table: {e}")

        # Deterministic sort: Gateway first, Host PC second, then IP numerical order
        def sort_key(d):
            if d.get("is_gateway"):
                return (0, 0)
            if d.get("is_host"):
                return (1, 0)
            try:
                return (2, int(d["ip"].split(".")[-1]))
            except Exception:
                return (2, 999)

        devices.sort(key=sort_key)

        return {
            "host_ip": host_ip,
            "gateway_ip": gateway_ip,
            "subnet": f"{base_prefix}0/24",
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

