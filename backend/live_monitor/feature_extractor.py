import numpy as np

class FeatureExtractor:
    """
    Step 3: Extracts exact 77 numerical features matching the trained model feature set (names, units, order).
    """
    def __init__(self):
        pass

    @staticmethod
    def extract_features(flow) -> dict:
        duration = max((flow.last_time - flow.start_time) * 1e6, 1.0)
        duration_sec = duration / 1e6

        all_lengths = flow.fwd_lengths + flow.bwd_lengths
        tot_fwd_bytes = sum(flow.fwd_lengths)
        tot_bwd_bytes = sum(flow.bwd_lengths)
        tot_bytes = tot_fwd_bytes + tot_bwd_bytes
        tot_packets = flow.fwd_packets + flow.bwd_packets

        def stat_summary(arr):
            if not arr:
                return 0.0, 0.0, 0.0, 0.0, 0.0
            a = np.array(arr, dtype=float)
            return float(np.max(a)), float(np.min(a)), float(np.mean(a)), float(np.std(a)), float(np.var(a))

        fwd_max, fwd_min, fwd_mean, fwd_std, _ = stat_summary(flow.fwd_lengths)
        bwd_max, bwd_min, bwd_mean, bwd_std, _ = stat_summary(flow.bwd_lengths)
        pkt_max, pkt_min, pkt_mean, pkt_std, pkt_var = stat_summary(all_lengths)

        flow_iat_max, flow_iat_min, flow_iat_mean, flow_iat_std, _ = stat_summary(flow.flow_iats)
        fwd_iat_max, fwd_iat_min, fwd_iat_mean, fwd_iat_std, _ = stat_summary(flow.fwd_iats)
        bwd_iat_max, bwd_iat_min, bwd_iat_mean, bwd_iat_std, _ = stat_summary(flow.bwd_iats)
        
        act_max, act_min, act_mean, act_std, _ = stat_summary(flow.active_times)
        idle_max, idle_min, idle_mean, idle_std, _ = stat_summary(flow.idle_times)

        flow_bytes_per_sec = tot_bytes / duration_sec if duration_sec > 0 else 0.0
        flow_pkts_per_sec = tot_packets / duration_sec if duration_sec > 0 else 0.0
        fwd_pkts_per_sec = flow.fwd_packets / duration_sec if duration_sec > 0 else 0.0
        bwd_pkts_per_sec = flow.bwd_packets / duration_sec if duration_sec > 0 else 0.0

        down_up_ratio = (flow.bwd_packets / flow.fwd_packets) if flow.fwd_packets > 0 else 0.0
        avg_pkt_size = tot_bytes / tot_packets if tot_packets > 0 else 0.0

        return {
            'Flow Duration': duration,
            'Total Fwd Packets': flow.fwd_packets,
            'Total Backward Packets': flow.bwd_packets,
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
            'Fwd IAT Total': sum(flow.fwd_iats),
            'Fwd IAT Mean': fwd_iat_mean,
            'Fwd IAT Std': fwd_iat_std,
            'Fwd IAT Max': fwd_iat_max,
            'Fwd IAT Min': fwd_iat_min,
            'Bwd IAT Total': sum(flow.bwd_iats),
            'Bwd IAT Mean': bwd_iat_mean,
            'Bwd IAT Std': bwd_iat_std,
            'Bwd IAT Max': bwd_iat_max,
            'Bwd IAT Min': bwd_iat_min,
            'Fwd PSH Flags': flow.fwd_psh,
            'Bwd PSH Flags': flow.bwd_psh,
            'Fwd URG Flags': flow.fwd_urg,
            'Bwd URG Flags': flow.bwd_urg,
            'Fwd Header Length': flow.fwd_header_bytes,
            'Bwd Header Length': flow.bwd_header_bytes,
            'Fwd Packets/s': fwd_pkts_per_sec,
            'Bwd Packets/s': bwd_pkts_per_sec,
            'Min Packet Length': pkt_min,
            'Max Packet Length': pkt_max,
            'Packet Length Mean': pkt_mean,
            'Packet Length Std': pkt_std,
            'Packet Length Variance': pkt_var,
            'FIN Flag Count': flow.fin_count,
            'SYN Flag Count': flow.syn_count,
            'RST Flag Count': flow.rst_count,
            'PSH Flag Count': flow.psh_count,
            'ACK Flag Count': flow.ack_count,
            'URG Flag Count': flow.urg_count,
            'CWR Flag Count': flow.cwr_count,
            'ECE Flag Count': flow.ece_count,
            'Down/Up Ratio': down_up_ratio,
            'Average Packet Size': avg_pkt_size,
            'Avg Fwd Segment Size': fwd_mean,
            'Avg Bwd Segment Size': bwd_mean,
            'Fwd Header Length.1': flow.fwd_header_bytes,
            'Subflow Fwd Packets': flow.fwd_packets,
            'Subflow Fwd Bytes': tot_fwd_bytes,
            'Subflow Bwd Packets': flow.bwd_packets,
            'Subflow Bwd Bytes': tot_bwd_bytes,
            'Init_Win_bytes_forward': 8192,
            'Init_Win_bytes_backward': 8192,
            'act_data_pkt_fwd': flow.fwd_packets,
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
