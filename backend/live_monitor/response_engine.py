import os
import sys
import time
import random
import argparse
import ipaddress

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.live_monitor.packet_sniffer import PacketSniffer
from backend.live_monitor.flow_builder import FlowBuilder
from backend.live_monitor.feature_extractor import FeatureExtractor
from framework.engine import NetriqEngine
from backend.ai.contracts import TrafficType


RFC1918_NETWORKS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
]

def is_private_ip(ip_str: str) -> bool:
    """Checks if an IP address strictly belongs to RFC1918 private IP space."""
    try:
        ip = ipaddress.ip_address(ip_str)
        return any(ip in net for net in RFC1918_NETWORKS)
    except ValueError:
        return False


def check_is_internal_flow(src_ip: str, dst_ip: str) -> bool:
    """
    RFC1918 Check for Layer 1 vs Layer 2 Decision Engine Routing:
    - src_ip is private RFC1918 (internal asset sending traffic) -> Layer 2 (is_internal = True).
    - src_ip is public/external (external host scanning/attacking in) -> Layer 1 (is_internal = False).
    """
    return is_private_ip(src_ip)


class LiveMonitorRunner:
    """
    Master pipeline orchestrating the execution chain:
    packet_sniffer -> flow_builder -> feature_extractor -> NetriqEngine (AI + Two-Layer Rules)
    """
    def __init__(self, dataset_name: str = "cicids2017"):
        self.dataset_name = dataset_name
        self.flow_builder = FlowBuilder(idle_timeout_sec=3.0)
        self.engine = NetriqEngine()
        self.sniffer = PacketSniffer()

    def process_packet(self, pkt_info: dict, enforce: bool = False) -> list:
        completed_flows = self.flow_builder.process_packet(pkt_info)
        responses = []

        for flow in completed_flows:
            features = FeatureExtractor.extract_features(flow)
            
            # 1. Determine if initiating asset is internal (Layer 2) or external (Layer 1)
            eval_ip = getattr(flow, 'initiator_ip', flow.src_ip)
            is_internal = is_private_ip(eval_ip)
            
            # 2. Evaluate features through NetriqEngine (AI Risk Engine + Decision Engine)
            result, decision = self.engine.evaluate_features(
                features=features,
                traffic_type=TrafficType.NETWORK,
                is_internal=is_internal
            )
            
            enforced_status = "EVALUATION_ONLY"
            if enforce:
                # Live mode: trigger real hardware adapters (firewall REST / SDN quarantine)
                if decision.action.value == "recommend_block":
                    import asyncio
                    asyncio.run(self.engine.firewall.block_ip(eval_ip, decision.reason))
                    enforced_status = "FIREWALL_RECOMMENDED"
                elif decision.action.value == "quarantine":
                    import asyncio
                    asyncio.run(self.engine.quarantine.quarantine_device(eval_ip, None, decision.reason))
                    enforced_status = "DEVICE_QUARANTINED"
            
            prediction_str = "ANOMALY" if result.verdict else "BENIGN"
            
            responses.append({
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(flow.last_time)),
                "connection": f"{flow.src_ip}:{flow.src_port} -> {flow.dst_ip}:{flow.dst_port} ({flow.protocol})",
                "src_ip": flow.src_ip,
                "dst_ip": flow.dst_ip,
                "src_port": flow.src_port,
                "dst_port": flow.dst_port,
                "protocol": flow.protocol,
                "prediction": prediction_str,
                "confidence": round(result.confidence, 2),
                "threat_level": result.risk_category.value.upper(),
                "is_anomaly": result.verdict,
                "is_internal": is_internal,
                "action": decision.action.value.upper(),
                "target_layer": decision.target_layer,
                "decision_msg": decision.reason,
                "enforce_status": enforced_status,
                "flow_summary": {
                    "duration_ms": round((flow.last_time - flow.start_time) * 1000.0, 2),
                    "fwd_packets": flow.fwd_packets,
                    "bwd_packets": flow.bwd_packets,
                    "total_bytes": sum(flow.fwd_lengths) + sum(flow.bwd_lengths)
                }
            })

        return responses

    def run_live(self, interface: str = None, enforce: bool = True):
        self.sniffer.interface = interface
        self.sniffer.start()
        print(f"[LiveMonitorRunner] Live Monitoring Active (Dataset: {self.dataset_name.upper()}, Enforce: {enforce})...\n")

        try:
            while True:
                pkt = self.sniffer.get_packet(timeout=1.0)
                if pkt:
                    responses = self.process_packet(pkt, enforce=enforce)
                    for resp in responses:
                        self._print_response(resp)
        except KeyboardInterrupt:
            print("\n[LiveMonitorRunner] Stopping live monitor...")
        finally:
            self.sniffer.stop()

    def run_simulation(self, count: int = 5, delay_sec: float = 0.5):
        print(f"[LiveMonitorRunner:Simulation] Running pipeline chain for {count} simulated flows...\n")
        attack_types = ['DDoS', 'PortScan', 'DoS Hulk', 'BENIGN', 'SSH-Patator']
        
        # Mix of external IPs (Layer 1 recommend block) and internal IPs (Layer 2 auto-quarantine)
        external_ips = ["203.0.113.45", "198.51.100.12", "198.51.100.89", "45.33.32.156"]
        internal_ips = ["192.168.1.50", "192.168.1.102", "10.0.0.15", "172.16.0.44"]
        
        for i in range(1, count + 1):
            traffic_type = random.choice(attack_types)
            
            # Alternate between external-attacker (Layer 1) and internal-compromised-host (Layer 2)
            if i % 2 == 1:
                src_ip = random.choice(external_ips) # External -> Layer 1
                dst_ip = "192.168.1.1"
            else:
                src_ip = random.choice(internal_ips) # Internal -> Layer 2
                dst_ip = "192.168.1.1"

            if traffic_type == 'PortScan':
                src_port = random.randint(40000, 60000)
                dst_port = random.choice([21, 22, 80, 443, 8080])
                pkts_fwd, pkts_bwd = 1, 0
                pkt_len_fwd = random.randint(40, 64)
                pkt_len_bwd = 0
            elif traffic_type in ['DDoS', 'DoS Hulk']:
                src_port = random.randint(1024, 65535)
                dst_port = 80
                pkts_fwd = random.randint(50, 200)
                pkts_bwd = random.randint(0, 5)
                pkt_len_fwd = random.randint(500, 1400)
                pkt_len_bwd = 60
            else:  # BENIGN
                src_port = random.randint(50000, 60000)
                dst_port = random.choice([80, 443])
                pkts_fwd = random.randint(5, 20)
                pkts_bwd = random.randint(5, 25)
                pkt_len_fwd = random.randint(100, 800)
                pkt_len_bwd = random.randint(500, 1500)

            now = time.time()
            for p in range(pkts_fwd):
                pkt_info = {
                    'src_ip': src_ip, 'dst_ip': dst_ip,
                    'src_port': src_port, 'dst_port': dst_port,
                    'protocol': 'TCP', 'length': pkt_len_fwd,
                    'header_len': 20, 'flags': {'SYN': (p == 0), 'ACK': True},
                    'timestamp': now + (p * 0.005)
                }
                responses = self.process_packet(pkt_info)
                for r in responses: self._print_response(r)

            for p in range(pkts_bwd):
                pkt_info = {
                    'src_ip': dst_ip, 'dst_ip': src_ip,
                    'src_port': dst_port, 'dst_port': src_port,
                    'protocol': 'TCP', 'length': pkt_len_bwd,
                    'header_len': 20, 'flags': {'ACK': True},
                    'timestamp': now + ((pkts_fwd + p) * 0.005)
                }
                responses = self.process_packet(pkt_info)
                for r in responses: self._print_response(r)

            fin_pkt = {
                'src_ip': src_ip, 'dst_ip': dst_ip,
                'src_port': src_port, 'dst_port': dst_port,
                'protocol': 'TCP', 'length': 54,
                'header_len': 20, 'flags': {'FIN': True, 'ACK': True},
                'timestamp': now + ((pkts_fwd + pkts_bwd + 1) * 0.005)
            }
            responses = self.process_packet(fin_pkt)
            for r in responses: self._print_response(r)

            time.sleep(delay_sec)

    def _print_response(self, resp: dict):
        status_tag = f"[{resp['enforce_status']}]" if resp.get("enforce_status") != "EVALUATION_ONLY" else "[SIMULATED DRY-RUN]"
        badge = f"[ACTION: {resp['action']}] [{resp['target_layer']}] {status_tag}"
        print(f"[{resp['timestamp']}] {badge} Threat Level: {resp['threat_level']}")
        print(f"  Connection : {resp['connection']}")
        print(f"  Prediction : {resp['prediction']} (Confidence: {resp['confidence']}%)")
        print(f"  Decision   : {resp['decision_msg']}")
        print(f"  Flow Stats : {resp['flow_summary']['duration_ms']} ms | Packets: {resp['flow_summary']['fwd_packets']} Fwd / {resp['flow_summary']['bwd_packets']} Bwd | Bytes: {resp['flow_summary']['total_bytes']:,} B")
        print("-" * 75)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NETRIQ Live Monitor Execution Chain")
    parser.add_argument("--mode", choices=["live", "simulate"], default="simulate")
    parser.add_argument("--dataset", default="cicids2017")
    parser.add_argument("--count", type=int, default=5)
    args = parser.parse_args()

    runner = LiveMonitorRunner(dataset_name=args.dataset)
    if args.mode == "simulate":
        runner.run_simulation(count=args.count, delay_sec=0.5)
    else:
        runner.run_live()
