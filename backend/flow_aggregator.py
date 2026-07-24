import time
import math
import numpy as np

class FlowKey:
    """
    Bidirectional 5-tuple identifier for network flows.
    """
    def __init__(self, src_ip, dst_ip, src_port, dst_port, protocol):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = protocol.upper()

    def get_key_and_direction(self):
        # Normalize key so forward and backward directions map to the same flow
        fwd_tuple = (self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol)
        bwd_tuple = (self.dst_ip, self.src_ip, self.dst_port, self.src_port, self.protocol)
        
        if fwd_tuple <= bwd_tuple:
            return fwd_tuple, "FORWARD"
        else:
            return bwd_tuple, "BACKWARD"

class Flow:
    """
    Represents an active bidirectional network flow and calculates CICIDS2017 numerical features.
    """
    def __init__(self, fwd_key_tuple, start_time):
        self.key_tuple = fwd_key_tuple
        self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol = fwd_key_tuple
        self.start_time = start_time
        self.last_time = start_time
        
        # Packet counts & lengths
        self.fwd_packets = 0
        self.bwd_packets = 0
        self.fwd_lengths = []
        self.bwd_lengths = []
        
        # Inter-arrival times (in microseconds)
        self.fwd_last_time = None
        self.bwd_last_time = None
        self.fwd_iats = []
        self.bwd_iats = []
        self.flow_iats = []
        
        # Headers
        self.fwd_header_bytes = 0
        self.bwd_header_bytes = 0
        
        # TCP Flags
        self.fin_count = 0
        self.syn_count = 0
        self.rst_count = 0
        self.psh_count = 0
        self.ack_count = 0
        self.urg_count = 0
        self.cwr_count = 0
        self.ece_count = 0
        
        self.fwd_psh = 0
        self.bwd_psh = 0
        self.fwd_urg = 0
        self.bwd_urg = 0
        
        # Active/Idle times
        self.active_times = []
        self.idle_times = []
        self.last_active_start = start_time

    def add_packet(self, pkt_len, direction, flags, timestamp, header_len=20):
        iat = (timestamp - self.last_time) * 1e6  # convert to microseconds
        if self.fwd_packets + self.bwd_packets > 0:
            self.flow_iats.append(iat)
            
            # Idle/Active calculation threshold (1 second = 1e6 us)
            if iat > 1e6:
                active_dur = (self.last_time - self.last_active_start) * 1e6
                if active_dur > 0:
                    self.active_times.append(active_dur)
                self.idle_times.append(iat)
                self.last_active_start = timestamp
                
        self.last_time = timestamp

        # TCP Flag parsing
        if isinstance(flags, dict):
            if flags.get('FIN'): self.fin_count += 1
            if flags.get('SYN'): self.syn_count += 1
            if flags.get('RST'): self.rst_count += 1
            if flags.get('PSH'): self.psh_count += 1
            if flags.get('ACK'): self.ack_count += 1
            if flags.get('URG'): self.urg_count += 1
            if flags.get('CWR'): self.cwr_count += 1
            if flags.get('ECE'): self.ece_count += 1

        if direction == "FORWARD":
            self.fwd_packets += 1
            self.fwd_lengths.append(pkt_len)
            self.fwd_header_bytes += header_len
            if flags.get('PSH'): self.fwd_psh += 1
            if flags.get('URG'): self.fwd_urg += 1
            if self.fwd_last_time is not None:
                self.fwd_iats.append((timestamp - self.fwd_last_time) * 1e6)
            self.fwd_last_time = timestamp
        else:
            self.bwd_packets += 1
            self.bwd_lengths.append(pkt_len)
            self.bwd_header_bytes += header_len
            if flags.get('PSH'): self.bwd_psh += 1
            if flags.get('URG'): self.bwd_urg += 1
            if self.bwd_last_time is not None:
                self.bwd_iats.append((timestamp - self.bwd_last_time) * 1e6)
            self.bwd_last_time = timestamp

    def extract_features(self) -> dict:
        """
        Calculates all 77 numerical features matching the CICIDS2017 training schema.
        """
        duration = max((self.last_time - self.start_time) * 1e6, 1.0)  # microseconds
        duration_sec = duration / 1e6

        all_lengths = self.fwd_lengths + self.bwd_lengths
        tot_fwd_bytes = sum(self.fwd_lengths)
        tot_bwd_bytes = sum(self.bwd_lengths)
        tot_bytes = tot_fwd_bytes + tot_bwd_bytes
        tot_packets = self.fwd_packets + self.bwd_packets

        def stat_summary(arr):
            if not arr:
                return 0.0, 0.0, 0.0, 0.0, 0.0
            a = np.array(arr, dtype=float)
            return float(np.max(a)), float(np.min(a)), float(np.mean(a)), float(np.std(a)), float(np.var(a))

        fwd_max, fwd_min, fwd_mean, fwd_std, _ = stat_summary(self.fwd_lengths)
        bwd_max, bwd_min, bwd_mean, bwd_std, _ = stat_summary(self.bwd_lengths)
        pkt_max, pkt_min, pkt_mean, pkt_std, pkt_var = stat_summary(all_lengths)

        flow_iat_max, flow_iat_min, flow_iat_mean, flow_iat_std, _ = stat_summary(self.flow_iats)
        fwd_iat_max, fwd_iat_min, fwd_iat_mean, fwd_iat_std, _ = stat_summary(self.fwd_iats)
        bwd_iat_max, bwd_iat_min, bwd_iat_mean, bwd_iat_std, _ = stat_summary(self.bwd_iats)
        
        act_max, act_min, act_mean, act_std, _ = stat_summary(self.active_times)
        idle_max, idle_min, idle_mean, idle_std, _ = stat_summary(self.idle_times)

        flow_bytes_per_sec = tot_bytes / duration_sec if duration_sec > 0 else 0.0
        flow_pkts_per_sec = tot_packets / duration_sec if duration_sec > 0 else 0.0
        fwd_pkts_per_sec = self.fwd_packets / duration_sec if duration_sec > 0 else 0.0
        bwd_pkts_per_sec = self.bwd_packets / duration_sec if duration_sec > 0 else 0.0

        down_up_ratio = (self.bwd_packets / self.fwd_packets) if self.fwd_packets > 0 else 0.0
        avg_pkt_size = tot_bytes / tot_packets if tot_packets > 0 else 0.0

        return {
            'Flow Duration': duration,
            'Total Fwd Packets': self.fwd_packets,
            'Total Backward Packets': self.bwd_packets,
            'Total Length of Fwd Packets': tot_fwd_bytes,
            'Total Length of Bwd Packets': tot_bwd_bytes,
            'Fwd Packet Length Max': fwd_max,
            'Fwd Packet Length Min': fwd_min,
            'Fwd Packet Length Mean': fwd_mean,
            'Fwd Packet Length Std': fwd_std,
            'Bwd Packet Length Max': bwd_max,
            'Bwd Packet Length Min': bwd_min,
            'Bwd Packet Length Mean': bwd_mean,
            'Bwd Packet Length Std': bwd_std,
            'Flow Bytes/s': flow_bytes_per_sec,
            'Flow Packets/s': flow_pkts_per_sec,
            'Flow IAT Mean': flow_iat_mean,
            'Flow IAT Std': flow_iat_std,
            'Flow IAT Max': flow_iat_max,
            'Flow IAT Min': flow_iat_min,
            'Fwd IAT Total': sum(self.fwd_iats),
            'Fwd IAT Mean': fwd_iat_mean,
            'Fwd IAT Std': fwd_iat_std,
            'Fwd IAT Max': fwd_iat_max,
            'Fwd IAT Min': fwd_iat_min,
            'Bwd IAT Total': sum(self.bwd_iats),
            'Bwd IAT Mean': bwd_iat_mean,
            'Bwd IAT Std': bwd_iat_std,
            'Bwd IAT Max': bwd_iat_max,
            'Bwd IAT Min': bwd_iat_min,
            'Fwd PSH Flags': self.fwd_psh,
            'Bwd PSH Flags': self.bwd_psh,
            'Fwd URG Flags': self.fwd_urg,
            'Bwd URG Flags': self.bwd_urg,
            'Fwd Header Length': self.fwd_header_bytes,
            'Bwd Header Length': self.bwd_header_bytes,
            'Fwd Packets/s': fwd_pkts_per_sec,
            'Bwd Packets/s': bwd_pkts_per_sec,
            'Min Packet Length': pkt_min,
            'Max Packet Length': pkt_max,
            'Packet Length Mean': pkt_mean,
            'Packet Length Std': pkt_std,
            'Packet Length Variance': pkt_var,
            'FIN Flag Count': self.fin_count,
            'SYN Flag Count': self.syn_count,
            'RST Flag Count': self.rst_count,
            'PSH Flag Count': self.psh_count,
            'ACK Flag Count': self.ack_count,
            'URG Flag Count': self.urg_count,
            'CWR Flag Count': self.cwr_count,
            'ECE Flag Count': self.ece_count,
            'Down/Up Ratio': down_up_ratio,
            'Average Packet Size': avg_pkt_size,
            'Avg Fwd Segment Size': fwd_mean,
            'Avg Bwd Segment Size': bwd_mean,
            'Fwd Header Length.1': self.fwd_header_bytes,
            'Subflow Fwd Packets': self.fwd_packets,
            'Subflow Fwd Bytes': tot_fwd_bytes,
            'Subflow Bwd Packets': self.bwd_packets,
            'Subflow Bwd Bytes': tot_bwd_bytes,
            'Init_Win_bytes_forward': 8192,
            'Init_Win_bytes_backward': 8192,
            'act_data_pkt_fwd': self.fwd_packets,
            'min_seg_size_forward': 20,
            'Active Mean': act_mean,
            'Active Std': act_std,
            'Active Max': act_max,
            'Active Min': act_min,
            'Idle Mean': idle_mean,
            'Idle Std': idle_std,
            'Idle Max': idle_max,
            'Idle Min': idle_min
        }

class FlowTracker:
    """
    Manages active flows and evicts completed / timed out flows.
    """
    def __init__(self, idle_timeout_sec=5.0):
        self.idle_timeout_sec = idle_timeout_sec
        self.flows = {}

    def process_packet(self, pkt_info: dict) -> list:
        """
        Process a single packet and return any completed flows.
        """
        completed_flows = []
        now = pkt_info.get('timestamp', time.time())
        
        fk = FlowKey(
            pkt_info['src_ip'], pkt_info['dst_ip'],
            pkt_info['src_port'], pkt_info['dst_port'],
            pkt_info['protocol']
        )
        key_tuple, direction = fk.get_key_and_direction()
        
        if key_tuple not in self.flows:
            self.flows[key_tuple] = Flow(key_tuple, now)
            
        flow = self.flows[key_tuple]
        flags = pkt_info.get('flags', {})
        header_len = pkt_info.get('header_len', 20)
        pkt_len = pkt_info.get('length', 60)
        
        flow.add_packet(pkt_len, direction, flags, now, header_len)
        
        # Check TCP FIN / RST flag for flow termination
        if flags.get('FIN') or flags.get('RST'):
            completed_flows.append(self.flows.pop(key_tuple))
            
        # Periodic check for timed out active flows
        keys_to_remove = []
        for k, f in list(self.flows.items()):
            if k == key_tuple:
                continue
            if (now - f.last_time) >= self.idle_timeout_sec:
                keys_to_remove.append(k)
                
        for k in keys_to_remove:
            completed_flows.append(self.flows.pop(k))
            
        return completed_flows
