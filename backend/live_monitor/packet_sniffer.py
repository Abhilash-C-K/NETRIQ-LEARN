import time
import queue
import threading
from typing import Optional, Callable, Dict, Any
from backend.utils.logger import get_logger

logger = get_logger(__name__)

IP = None
IPv6 = None
TCP = None
UDP = None
ICMP = None
sniff = None

try:
    from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False


class PacketSniffer:
    """
    Step 1: Captures raw packets flowing through network interfaces and extracts standard headers.

    Packet Processing Taxonomy:
    - Normal IP Traffic: Successfully parsed and enqueued into packet_queue for FlowBuilder.
    - Case A (Non-IP Traffic): ARP, STP, LLDP, etc. High-volume, non-IP frames. Tracked via silent
      non_ip_count counter without per-packet log spam.
    - Case B (Malformed IP Traffic): IP layer present but transport layer options/header length fields
      corrupted or malformed. Trapped and routed directly to the injected heuristic_callback for
      evasion mitigation and [HEURISTIC_FALLBACK] evaluation.
    - Queue-Full Drops: Rate-limited summary logging via [QUEUE_DROP_SUMMARY] every QUEUE_DROP_LOG_INTERVAL_SEC.

    PERFORMANCE NOTE:
    heuristic_callback is executed synchronously on the packet capture thread. Callback handlers MUST
    remain strictly in-memory and non-blocking (<1ms execution time) to prevent throttling live capture throughput.
    """

    QUEUE_DROP_LOG_INTERVAL_SEC: float = 5.0

    def __init__(
        self,
        interface: Optional[str] = None,
        packet_filter: str = "ip",
        max_queue_size: int = 10000,
        heuristic_callback: Optional[Callable[[Dict[str, Any]], None]] = None,
    ):
        self.interface = interface
        self.packet_filter = packet_filter
        self.packet_queue = queue.Queue(maxsize=max_queue_size)
        self.heuristic_callback = heuristic_callback
        self.is_running = False
        self.sniffer_thread: Optional[threading.Thread] = None

        # Visibility metrics & rate-limiting state
        self.queue_drop_count: int = 0
        self.non_ip_count: int = 0
        self.malformed_ip_count: int = 0
        self.last_drop_log_time: float = time.time()

    def _check_emit_queue_drop_summary(self) -> None:
        """Emits a periodic summary log for dropped packets under queue overflow conditions."""
        now = time.time()
        elapsed = now - self.last_drop_log_time
        if elapsed >= self.QUEUE_DROP_LOG_INTERVAL_SEC and self.queue_drop_count > 0:
            logger.warning(
                f"[QUEUE_DROP_SUMMARY] Dropped {self.queue_drop_count} packets in the last "
                f"{round(elapsed, 1)}s — consumer falling behind capture rate."
            )
            self.queue_drop_count = 0
            self.last_drop_log_time = now

    def _process_packet(self, pkt: Any) -> None:
        """
        Callback passed to Scapy sniff().
        Differentiates normal IP traffic from Case A (Non-IP) and Case B (Malformed IP).
        """
        # Case A: Legitimate non-IP frame (ARP, STP, LLDP, etc.)
        if not (pkt.haslayer(IP) or pkt.haslayer(IPv6)):
            self.non_ip_count += 1
            return

        timestamp = float(pkt.time) if hasattr(pkt, 'time') else time.time()
        length = len(pkt)

        # Case B Parsing Attempt: IP layer is present, attempt transport layer extraction
        ip_layer = None
        tcp = None
        udp = None

        try:
            if pkt.haslayer(IP):
                ip_layer = pkt[IP]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst
            else:
                ip_layer = pkt[IPv6]
                src_ip = ip_layer.src
                dst_ip = ip_layer.dst

            proto_name = "OTHER"
            src_port = 0
            dst_port = 0
            header_len = 20
            flags = {}

            if pkt.haslayer(TCP):
                proto_name = "TCP"
                tcp = pkt[TCP]
                src_port = int(tcp.sport)
                dst_port = int(tcp.dport)
                
                # Check for malformed dataofs / header length calculation
                dataofs = getattr(tcp, 'dataofs', None)
                if dataofs is None or dataofs < 5:
                    raise ValueError(f"Malformed TCP dataofs header offset: {dataofs}")
                header_len = dataofs * 4

                flag_str = str(tcp.flags)
                flags = {
                    'FIN': 'F' in flag_str,
                    'SYN': 'S' in flag_str,
                    'RST': 'R' in flag_str,
                    'PSH': 'P' in flag_str,
                    'ACK': 'A' in flag_str,
                    'URG': 'U' in flag_str,
                    'ECE': 'E' in flag_str,
                    'CWR': 'C' in flag_str,
                }
            elif pkt.haslayer(UDP):
                proto_name = "UDP"
                udp = pkt[UDP]
                src_port = int(udp.sport)
                dst_port = int(udp.dport)
                header_len = 8
            elif pkt.haslayer(ICMP):
                proto_name = "ICMP"
                header_len = 8

            pkt_dict = {
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'src_port': src_port,
                'dst_port': dst_port,
                'protocol': proto_name,
                'length': length,
                'header_len': header_len,
                'flags': flags,
                'timestamp': timestamp,
            }

            try:
                self.packet_queue.put_nowait(pkt_dict)
            except queue.Full:
                self.queue_drop_count += 1
                self._check_emit_queue_drop_summary()

        except (ValueError, AttributeError, IndexError, TypeError, KeyError) as e:
            # Case B: IP layer exists but deeper transport parsing failed (expected malformed network packet)
            self.malformed_ip_count += 1
            src_ip = getattr(ip_layer, 'src', 'unknown') if 'ip_layer' in locals() else 'unknown'
            dst_ip = getattr(ip_layer, 'dst', 'unknown') if 'ip_layer' in locals() else 'unknown'

            # Attempt best-effort extraction of ports if layer was partially accessible
            extracted_src_port = 0
            extracted_dst_port = 0
            if 'tcp' in locals() and tcp is not None:
                extracted_src_port = getattr(tcp, 'sport', 0)
                extracted_dst_port = getattr(tcp, 'dport', 0)
            elif 'udp' in locals() and udp is not None:
                extracted_src_port = getattr(udp, 'sport', 0)
                extracted_dst_port = getattr(udp, 'dport', 0)

            partial_dict = {
                'src_ip': src_ip,
                'dst_ip': dst_ip,
                'src_port': extracted_src_port,
                'dst_port': extracted_dst_port,
                'protocol': 'MALFORMED',
                'length': length,
                'raw_len': length,
                'header_len': 0,
                'flags': {},
                'timestamp': timestamp,
                'is_malformed': True,
                'parse_error': str(e),
            }

            logger.warning(f"[packet_sniffer][CASE_B_MALFORMED] Corrupted IP packet from {src_ip}: {e}")

            if self.heuristic_callback:
                try:
                    self.heuristic_callback(partial_dict)
                except Exception as cb_err:
                    logger.error(f"[packet_sniffer] Heuristic callback error: {cb_err}")
        except Exception as bug_e:
            # Unexpected implementation or system bug during packet processing
            logger.error(f"[packet_sniffer][CASE_B_PARSER_BUG] Unexpected exception in packet processing: {bug_e}", exc_info=True)

    def _sniff_loop(self) -> None:
        if not SCAPY_AVAILABLE or sniff is None:
            logger.error("[packet_sniffer] Scapy is not installed. Cannot capture live packets.")
            return

        try:
            sniff(
                iface=self.interface,
                filter=self.packet_filter,
                prn=self._process_packet,
                store=False,
                stop_filter=lambda p: not self.is_running,
            )
        except Exception as e:
            logger.error(f"[packet_sniffer] Sniff loop error: {e}")

    def start(self) -> None:
        if self.is_running:
            return
        self.is_running = True
        self.sniffer_thread = threading.Thread(target=self._sniff_loop, daemon=True)
        self.sniffer_thread.start()
        logger.info(f"[packet_sniffer] Started packet capture on interface '{self.interface or 'default'}'.")

    def stop(self) -> None:
        self.is_running = False
        if self.sniffer_thread and self.sniffer_thread.is_alive():
            self.sniffer_thread.join(timeout=2.0)
        logger.info("[packet_sniffer] Stopped packet capture.")

    def get_packet(self, timeout: float = 1.0) -> Optional[Dict[str, Any]]:
        try:
            return self.packet_queue.get(block=True, timeout=timeout)
        except queue.Empty:
            return None


if __name__ == "__main__":
    sniffer = PacketSniffer()
    print("Testing packet_sniffer module...")
    sniffer.start()
    time.sleep(2.0)
    sniffer.stop()
