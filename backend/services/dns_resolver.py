import socket
import threading
from concurrent.futures import ThreadPoolExecutor
from typing import Optional, Dict, Set, Any
from backend.utils.logger import get_logger

logger = get_logger(__name__)

class DynamicDnsResolver:
    """
    100% Real, Dynamic Domain & Hostname Resolver.
    Zero hardcoded mock tables.
    
    Populated in real-time from 4 dynamic sources:
    1. Live DNS response packet sniffing (UDP 53 / 5353, Scapy DNS/DNSRR)
    2. TLS ClientHello Server Name Indication (SNI)
    3. Plaintext HTTP Host headers
    4. Non-blocking asynchronous OS reverse DNS (PTR) lookups via thread pool
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._ip_to_domain: Dict[str, str] = {}
        self._pending_lookups: Set[str] = set()
        self._executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="dns_resolver_worker")

    @staticmethod
    def is_private_ip(ip: Optional[str]) -> bool:
        if not ip:
            return True
        try:
            import ipaddress
            return ipaddress.ip_address(ip).is_private
        except ValueError:
            return False

    def _clean_domain(self, raw_domain: Optional[str]) -> Optional[str]:
        if not raw_domain:
            return None
        domain = raw_domain.strip().rstrip(".").lower()
        # Filter out local machine name (e.g. "shiva")
        try:
            local_host = socket.gethostname().lower()
            if domain == local_host or domain.startswith(local_host + "."):
                return None
        except Exception:
            pass

        # Filter out invalid, internal reverse arpa, or local mDNS suffixes
        if not domain or domain.endswith(".in-addr.arpa") or domain.endswith(".ip6.arpa") or domain.endswith(".local"):
            return None
        # Filter out if it's just an IP address itself
        try:
            socket.inet_aton(domain)
            return None
        except socket.error:
            pass
        return domain

    def register_mapping(self, ip: Optional[str], domain: Optional[str]) -> None:
        """Register an IP -> domain mapping discovered in network traffic."""
        if not ip:
            return
        clean = self._clean_domain(domain)
        if not clean:
            return
        with self._lock:
            # Overwrite or store the discovered domain
            self._ip_to_domain[ip] = clean

    def register_dns_packet(self, pkt: Any) -> None:
        """
        Inspects Scapy DNS response packets (UDP 53/5353) and maps every resolved IP to its requested domain.
        Safely isolated in try/except to never crash sniffer.
        """
        try:
            from scapy.all import DNS, DNSRR
            if not pkt.haslayer(DNS):
                return
            
            dns = pkt[DNS]
            # Must be a DNS response (qr == 1)
            if getattr(dns, "qr", 0) != 1 or not hasattr(dns, "an") or not dns.an:
                return

            # Extract queried domain if available
            queried_domain = None
            if hasattr(dns, "qd") and dns.qd and hasattr(dns.qd, "qname") and dns.qd.qname:
                qname = dns.qd.qname
                queried_domain = qname.decode("utf-8", errors="ignore") if isinstance(qname, bytes) else str(qname)

            for rr_entry in dns.an:
                layer = rr_entry
                while layer:
                    if isinstance(layer, DNSRR):
                        rr_type = getattr(layer, "type", 0)
                        # Type 1 = A (IPv4), Type 28 = AAAA (IPv6)
                        if rr_type in (1, 28):
                            rdata = getattr(layer, "rdata", None)
                            rrname = getattr(layer, "rrname", None)
                            
                            ip_str = str(rdata) if rdata else None
                            domain_str = queried_domain
                            if not domain_str and rrname:
                                domain_str = rrname.decode("utf-8", errors="ignore") if isinstance(rrname, bytes) else str(rrname)

                            if ip_str and domain_str:
                                self.register_mapping(ip_str, domain_str)

                    layer = layer.payload if hasattr(layer, "payload") and getattr(layer.payload, "name", "") != "NoPayload" else None

        except Exception as e:
            # Graceful degrade - never interfere with core sniffer
            logger.debug(f"[dns_resolver] DNS packet parsing skipped: {e}")

    def _async_reverse_lookup(self, ip: str) -> None:
        """Worker function for reverse DNS lookup (socket.gethostbyaddr)."""
        try:
            # First attempt gethostbyaddr
            hostname, aliases, _ = socket.gethostbyaddr(ip)
            clean = self._clean_domain(hostname)
            if clean:
                with self._lock:
                    self._ip_to_domain[ip] = clean
                    return
        except Exception:
            pass

        try:
            # Secondary attempt getnameinfo
            name_info = socket.getnameinfo((ip, 0), socket.NI_NAMEREQD)
            if name_info and name_info[0]:
                clean = self._clean_domain(name_info[0])
                if clean:
                    with self._lock:
                        self._ip_to_domain[ip] = clean
        except Exception:
            pass

    def get_domain(self, ip: Optional[str]) -> Optional[str]:
        """
        Get domain for an IP address. If unknown and external, triggers asynchronous PTR lookup.
        Non-blocking: returns None immediately while resolution happens in background.
        """
        if not ip:
            return None
        
        # Don't resolve loopback, unassigned, or private LAN IPs
        if ip in ("127.0.0.1", "::1", "0.0.0.0", "unknown") or self.is_private_ip(ip):
            return None

        with self._lock:
            if ip in self._ip_to_domain:
                return self._ip_to_domain[ip]

            if ip not in self._pending_lookups:
                self._pending_lookups.add(ip)
                # Keep pending lookup set bounded
                if len(self._pending_lookups) > 2048:
                    self._pending_lookups.clear()
                # Submit background reverse lookup
                self._executor.submit(self._async_reverse_lookup, ip)

        return None

    def resolve_flow_domain(self, flow: Any, src_ip: Optional[str] = None, dst_ip: Optional[str] = None) -> Optional[str]:
        """
        Resolves domain/hostname for a flow using SNI, cached DNS, or reverse DNS.
        Guarantees that private LAN IPs / local hostname (Shiva) are NEVER returned.
        """
        sni = getattr(flow, "sni", None)
        if sni:
            clean = self._clean_domain(sni)
            if clean:
                if dst_ip and not self.is_private_ip(dst_ip):
                    self.register_mapping(dst_ip, clean)
                return clean

        # Check destination IP first if external
        if dst_ip and not self.is_private_ip(dst_ip):
            dom = self.get_domain(dst_ip)
            if dom:
                return dom

        # Check source IP next if external
        if src_ip and not self.is_private_ip(src_ip):
            dom = self.get_domain(src_ip)
            if dom:
                return dom

        return None

# Singleton instance
dns_resolver = DynamicDnsResolver()
