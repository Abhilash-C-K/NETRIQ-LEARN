import os
import sys
import time
import random
import argparse

# Ensure UTF-8 output encoding for Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if PROJECT_ROOT not in sys.path:
    sys.path.append(PROJECT_ROOT)

from backend.live_monitor.packet_sniffer import PacketSniffer
from backend.live_monitor.flow_builder import FlowBuilder
from backend.live_monitor.feature_extractor import FeatureExtractor
from backend.live_monitor.live_predictor import LivePredictor

class ResponseEngine:
    """
    Step 5: Automated Response Engine for NetrIQ.
    Decides system action: 'SAFE', 'ALERT_ADMIN', or 'BLOCK_FIREWALL'.
    """
    def __init__(self, block_confidence_threshold=85.0):
        self.block_confidence_threshold = block_confidence_threshold
        self.blocked_ips = set()

    def process_prediction(self, prediction_res: dict, flow) -> dict:
        is_anomaly = prediction_res["is_anomaly"]
        confidence = prediction_res["confidence"]
        prediction = prediction_res["prediction"]
        src_ip = flow.src_ip

        if not is_anomaly:
            action = "SAFE"
            decision_msg = "Traffic verified normal. No action required."
        elif confidence >= self.block_confidence_threshold:
            action = "BLOCK_FIREWALL"
            self.blocked_ips.add(src_ip)
            decision_msg = f"High severity threat detected ({prediction} @ {confidence}%). Automated firewall block applied to IP: {src_ip}"
        else:
            action = "ALERT_ADMIN"
            decision_msg = f"Moderate severity anomaly detected ({prediction} @ {confidence}%). Alert dispatched to admin dashboard."

        return {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(flow.last_time)),
            "connection": f"{flow.src_ip}:{flow.src_port} -> {flow.dst_ip}:{flow.dst_port} ({flow.protocol})",
            "src_ip": flow.src_ip,
            "dst_ip": flow.dst_ip,
            "src_port": flow.src_port,
            "dst_port": flow.dst_port,
            "protocol": flow.protocol,
            "prediction": prediction,
            "confidence": confidence,
            "threat_level": prediction_res["threat_level"],
            "is_anomaly": is_anomaly,
            "action": action,
            "decision_msg": decision_msg,
            "flow_summary": {
                "duration_ms": round((flow.last_time - flow.start_time) * 1000.0, 2),
                "fwd_packets": flow.fwd_packets,
                "bwd_packets": flow.bwd_packets,
                "total_bytes": sum(flow.fwd_lengths) + sum(flow.bwd_lengths)
            }
        }

class LiveMonitorRunner:
    """
    Master pipeline orchestrating the execution chain:
    packet_sniffer -> flow_builder -> feature_extractor -> live_predictor -> response_engine
    """
    def __init__(self, dataset_name="cicids2017"):
        self.dataset_name = dataset_name
        self.flow_builder = FlowBuilder(idle_timeout_sec=3.0)
        self.predictor = LivePredictor(dataset_name=dataset_name)
        self.response_engine = ResponseEngine()
        self.sniffer = PacketSniffer()

    def process_packet(self, pkt_info: dict) -> list:
        completed_flows = self.flow_builder.process_packet(pkt_info)
        responses = []

        for flow in completed_flows:
            features = FeatureExtractor.extract_features(flow)
            prediction_res = self.predictor.predict(features)
            response = self.response_engine.process_prediction(prediction_res, flow)
            responses.append(response)

        return responses

    def run_live(self, interface=None):
        self.sniffer.interface = interface
        self.sniffer.start()
        print(f"[LiveMonitorRunner] Live Monitoring Active (Dataset: {self.dataset_name.upper()})...\n")

        try:
            while True:
                pkt = self.sniffer.get_packet(timeout=1.0)
                if pkt:
                    responses = self.process_packet(pkt)
                    for resp in responses:
                        self._print_response(resp)
        except KeyboardInterrupt:
            print("\n[LiveMonitorRunner] Stopping live monitor...")
        finally:
            self.sniffer.stop()

    def run_simulation(self, count=5, delay_sec=0.5):
        print(f"[LiveMonitorRunner:Simulation] Running pipeline chain for {count} simulated flows...\n")
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

    def _print_response(self, resp):
        badge = f"[ACTION: {resp['action']}]"
        print(f"[{resp['timestamp']}] {badge} Threat Level: {resp['threat_level']}")
        print(f"  Connection : {resp['connection']}")
        print(f"  Prediction : {resp['prediction']} (Confidence: {resp['confidence']}%)")
        print(f"  Decision   : {resp['decision_msg']}")
        print(f"  Flow Stats : {resp['flow_summary']['duration_ms']} ms | Packets: {resp['flow_summary']['fwd_packets']} Fwd / {resp['flow_summary']['bwd_packets']} Bwd | Bytes: {resp['flow_summary']['total_bytes']:,} B")
        print("-" * 75)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetrIQ Live Monitor Execution Chain")
    parser.add_argument("--mode", choices=["live", "simulate"], default="simulate")
    parser.add_argument("--dataset", default="cicids2017")
    parser.add_argument("--count", type=int, default=5)
    args = parser.parse_args()

    runner = LiveMonitorRunner(dataset_name=args.dataset)
    if args.mode == "simulate":
        runner.run_simulation(count=args.count, delay_sec=0.5)
    else:
        runner.run_live()
