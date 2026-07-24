import time
import queue
import threading
import sys

try:
    from scapy.all import sniff, IP, IPv6, TCP, UDP, ICMP
    SCAPY_AVAILABLE = True
except ImportError:
    SCAPY_AVAILABLE = False

class NetworkSniffer:
    """
    Live packet sniffer module for NetrIQ using Scapy.
    """
    def __init__(self, interface=None, packet_filter="ip", max_queue_size=10000):
        self.interface = interface
        self.packet_filter = packet_filter
        self.packet_queue = queue.Queue(maxsize=max_queue_size)
        self.is_running = False
        self.sniffer_thread = None

    def _process_scapy_packet(self, pkt):
        if not (pkt.haslayer(IP) or pkt.haslayer(IPv6)):
            return

        timestamp = float(pkt.time) if hasattr(pkt, 'time') else time.time()
        length = len(pkt)

        if pkt.haslayer(IP):
            ip_layer = pkt[IP]
            src_ip = ip_layer.src
            dst_ip = ip_layer.dst
            proto_num = ip_layer.proto
        else:
            ip_layer = pkt[IPv6]
            src_ip = ip_layer.src
            dst_ip = ip_layer.dst
            proto_num = ip_layer.nh

        proto_name = "OTHER"
        src_port = 0
        dst_port = 0
        header_len = 20
        flags = {}

        if pkt.haslayer(TCP):
            proto_name = "TCP"
            tcp = pkt[TCP]
            src_port = tcp.sport
            dst_port = tcp.dport
            header_len = tcp.dataofs * 4 if hasattr(tcp, 'dataofs') else 20
            
            # Scapy TCP Flag representations
            flag_str = str(tcp.flags)
            flags = {
                'FIN': 'F' in flag_str,
                'SYN': 'S' in flag_str,
                'RST': 'R' in flag_str,
                'PSH': 'P' in flag_str,
                'ACK': 'A' in flag_str,
                'URG': 'U' in flag_str,
                'ECE': 'E' in flag_str,
                'CWR': 'C' in flag_str
            }
        elif pkt.haslayer(UDP):
            proto_name = "UDP"
            udp = pkt[UDP]
            src_port = udp.sport
            dst_port = udp.dport
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
            'timestamp': timestamp
        }

        try:
            self.packet_queue.put_nowait(pkt_dict)
        except queue.Full:
            pass  # Drop packet if queue is full to prevent memory bloat

    def _sniff_loop(self):
        if not SCAPY_AVAILABLE:
            print("[NetworkSniffer] Error: Scapy library is not installed.")
            return

        try:
            sniff(
                iface=self.interface,
                filter=self.packet_filter,
                prn=self._process_scapy_packet,
                store=False,
                stop_filter=lambda p: not self.is_running
            )
        except Exception as e:
            print(f"[NetworkSniffer] Sniffing error: {e}")

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.sniffer_thread = threading.Thread(target=self._sniff_loop, daemon=True)
        self.sniffer_thread.start()
        print(f"[NetworkSniffer] Live packet capture started on interface '{self.interface or 'default'}'.")

    def stop(self):
        self.is_running = False
        if self.sniffer_thread and self.sniffer_thread.is_alive():
            self.sniffer_thread.join(timeout=2.0)
        print("[NetworkSniffer] Live packet capture stopped.")

    def get_packet(self, timeout=1.0):
        try:
            return self.packet_queue.get(block=True, timeout=timeout)
        except queue.Empty:
            return None

if __name__ == "__main__":
    sniffer = NetworkSniffer()
    print("Testing NetworkSniffer (Press Ctrl+C to stop)...")
    sniffer.start()
    try:
        count = 0
        while count < 5:
            pkt = sniffer.get_packet(timeout=2.0)
            if pkt:
                count += 1
                print(f"Captured Packet #{count}: {pkt['src_ip']}:{pkt['src_port']} -> {pkt['dst_ip']}:{pkt['dst_port']} ({pkt['protocol']}) [{pkt['length']} bytes]")
    except KeyboardInterrupt:
        pass
    finally:
        sniffer.stop()
