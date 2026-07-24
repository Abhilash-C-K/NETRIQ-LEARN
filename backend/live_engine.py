import os
import sys
import time
import random
import argparse

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Add project root to path
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.sniffer import NetworkSniffer
from backend.flow_aggregator import FlowTracker
from backend.predictor import get_predictor

class NetrIQLiveEngine:
    """
    Live Traffic Capture, Feature Extractor & Real-Time Threat Prediction Engine for NetrIQ.
    """
    def __init__(self, dataset_name="cicids2017", idle_timeout_sec=3.0):
        self.dataset_name = dataset_name
        self.predictor = get_predictor(dataset_name)
        self.flow_tracker = FlowTracker(idle_timeout_sec=idle_timeout_sec)
        self.sniffer = NetworkSniffer()
        self.is_running = False

    def process_packet_info(self, pkt_info: dict) -> list:
        """
        Processes a packet dictionary, updates active flow, and yields threat alerts for any completed flows.
        """
        completed_flows = self.flow_tracker.process_packet(pkt_info)
        threat_alerts = []

        for flow in completed_flows:
            features_dict = flow.extract_features()
            
            # Predict using NetrIQPredictor
            prediction_res = self.predictor.predict_flow(features_dict)
            
            # Format comprehensive live threat alert output
            alert = {
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(flow.last_time)),
                "src_ip": flow.src_ip,
                "dst_ip": flow.dst_ip,
                "src_port": flow.src_port,
                "dst_port": flow.dst_port,
                "protocol": flow.protocol,
                "dataset": self.dataset_name,
                "prediction": prediction_res["prediction"],
                "confidence": round(prediction_res["confidence"] * 100, 2),
                "threat_level": prediction_res["threat_level"],
                "is_anomaly": prediction_res["is_anomaly"],
                "flow_summary": {
                    "duration_ms": round(features_dict["Flow Duration"] / 1000.0, 2),
                    "fwd_packets": flow.fwd_packets,
                    "bwd_packets": flow.bwd_packets,
                    "total_bytes": sum(flow.fwd_lengths) + sum(flow.bwd_lengths)
                }
            }
            threat_alerts.append(alert)

        return threat_alerts

    def start_live_capture(self, interface=None, callback=None):
        """
        Starts sniffing real network packets on interface.
        """
        self.sniffer.interface = interface
        self.sniffer.start()
        self.is_running = True
        print(f"[NetrIQLiveEngine] Listening for live network flows ({self.dataset_name.upper()})...\n")

        try:
            while self.is_running:
                pkt = self.sniffer.get_packet(timeout=1.0)
                if pkt:
                    alerts = self.process_packet_info(pkt)
                    for alert in alerts:
                        if callback:
                            callback(alert)
                        else:
                            self._print_alert(alert)
        except KeyboardInterrupt:
            print("\n[NetrIQLiveEngine] Stopping live capture...")
        finally:
            self.stop()

    def simulate_traffic_stream(self, count=10, delay_sec=0.5, callback=None):
        """
        Simulates live network traffic (normal browsing, DDoS floods, PortScans) for testing without admin permissions.
        """
        print(f"[NetrIQLiveEngine:Simulation] Generating {count} live traffic flows...")
        
        attack_types = ['BENIGN', 'DDoS', 'PortScan', 'DoS Hulk', 'SSH-Patator']
        
        for i in range(1, count + 1):
            traffic_type = random.choice(attack_types)
            src_ip = f"192.168.1.{random.randint(10, 250)}"
            dst_ip = "192.168.1.1"
            
            if traffic_type == 'PortScan':
                src_port = random.randint(40000, 60000)
                dst_port = random.choice([21, 22, 80, 443, 8080, 3306])
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

            # Generate synthetic packet stream for flow creation
            now = time.time()
            for p in range(pkts_fwd):
                pkt_info = {
                    'src_ip': src_ip, 'dst_ip': dst_ip,
                    'src_port': src_port, 'dst_port': dst_port,
                    'protocol': 'TCP', 'length': pkt_len_fwd,
                    'header_len': 20, 'flags': {'SYN': (p == 0), 'ACK': True},
                    'timestamp': now + (p * 0.005)
                }
                alerts = self.process_packet_info(pkt_info)

            for p in range(pkts_bwd):
                pkt_info = {
                    'src_ip': dst_ip, 'dst_ip': src_ip,
                    'src_port': dst_port, 'dst_port': src_port,
                    'protocol': 'TCP', 'length': pkt_len_bwd,
                    'header_len': 20, 'flags': {'ACK': True},
                    'timestamp': now + ((pkts_fwd + p) * 0.005)
                }
                alerts = self.process_packet_info(pkt_info)

            # Force flow finish (FIN flag)
            fin_pkt = {
                'src_ip': src_ip, 'dst_ip': dst_ip,
                'src_port': src_port, 'dst_port': dst_port,
                'protocol': 'TCP', 'length': 54,
                'header_len': 20, 'flags': {'FIN': True, 'ACK': True},
                'timestamp': now + ((pkts_fwd + pkts_bwd + 1) * 0.005)
            }
            alerts = self.process_packet_info(fin_pkt)
            
            for alert in alerts:
                if callback:
                    callback(alert)
                else:
                    self._print_alert(alert)

            time.sleep(delay_sec)

    def _print_alert(self, alert):
        badge = "[ALERT: ANOMALY]" if alert["is_anomaly"] else "[OK: BENIGN]"
        print(f"[{alert['timestamp']}] {badge} Threat Level: {alert['threat_level']}")
        print(f"  Connection : {alert['src_ip']}:{alert['src_port']} -> {alert['dst_ip']}:{alert['dst_port']} ({alert['protocol']})")
        print(f"  Prediction : {alert['prediction']} (Confidence: {alert['confidence']}%)")
        print(f"  Flow Stats : {alert['flow_summary']['duration_ms']} ms | Packets: {alert['flow_summary']['fwd_packets']} Fwd / {alert['flow_summary']['bwd_packets']} Bwd | Bytes: {alert['flow_summary']['total_bytes']:,} B")
        print("-" * 75)

    def stop(self):
        self.is_running = False
        self.sniffer.stop()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetrIQ Live Traffic Capture & Feature Extraction Engine")
    parser.add_argument("--mode", choices=["live", "simulate"], default="simulate", help="Execution mode (live packet capture or simulation)")
    parser.add_argument("--dataset", default="cicids2017", help="Model dataset to use for classification (cicids2017, nsl_kdd, unsw)")
    parser.add_argument("--count", type=int, default=5, help="Number of simulated flows (for simulate mode)")
    args = parser.parse_args()

    engine = NetrIQLiveEngine(dataset_name=args.dataset)

    if args.mode == "simulate":
        engine.simulate_traffic_stream(count=args.count, delay_sec=0.5)
    else:
        engine.start_live_capture()
