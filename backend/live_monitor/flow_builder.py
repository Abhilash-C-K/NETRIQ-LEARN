import time

class FlowKey:
    """
    Bidirectional 5-tuple identifier for grouping packets into flows.
    """
    def __init__(self, src_ip, dst_ip, src_port, dst_port, protocol):
        self.src_ip = src_ip
        self.dst_ip = dst_ip
        self.src_port = src_port
        self.dst_port = dst_port
        self.protocol = str(protocol).upper()

    def get_key_and_direction(self):
        fwd_tuple = (self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol)
        bwd_tuple = (self.dst_ip, self.src_ip, self.dst_port, self.src_port, self.protocol)
        
        if fwd_tuple <= bwd_tuple:
            return fwd_tuple, "FORWARD"
        else:
            return bwd_tuple, "BACKWARD"

class FlowData:
    """
    Data structure storing bidirectional packet statistics for a single network flow.
    """
    def __init__(self, key_tuple, start_time):
        self.key_tuple = key_tuple
        self.src_ip, self.dst_ip, self.src_port, self.dst_port, self.protocol = key_tuple
        self.start_time = start_time
        self.last_time = start_time
        
        self.fwd_packets = 0
        self.bwd_packets = 0
        self.fwd_lengths = []
        self.bwd_lengths = []
        
        self.fwd_last_time = None
        self.bwd_last_time = None
        self.fwd_iats = []
        self.bwd_iats = []
        self.flow_iats = []
        
        self.fwd_header_bytes = 0
        self.bwd_header_bytes = 0
        
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
        
        self.active_times = []
        self.idle_times = []
        self.last_active_start = start_time

    def add_packet(self, pkt_len, direction, flags, timestamp, header_len=20):
        iat = (timestamp - self.last_time) * 1e6
        if self.fwd_packets + self.bwd_packets > 0:
            self.flow_iats.append(iat)
            if iat > 1e6:
                active_dur = (self.last_time - self.last_active_start) * 1e6
                if active_dur > 0:
                    self.active_times.append(active_dur)
                self.idle_times.append(iat)
                self.last_active_start = timestamp
                
        self.last_time = timestamp

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

class FlowBuilder:
    """
    Step 2: Groups raw packets into bidirectional 5-tuple flows and manages active flow lifecycle.
    """
    def __init__(self, idle_timeout_sec=3.0):
        self.idle_timeout_sec = idle_timeout_sec
        self.active_flows = {}
        self.last_cleanup_time = time.time()

    def process_packet(self, pkt_info: dict) -> list:
        completed_flows = []
        now = pkt_info.get('timestamp', time.time())
        
        fk = FlowKey(
            pkt_info['src_ip'], pkt_info['dst_ip'],
            pkt_info['src_port'], pkt_info['dst_port'],
            pkt_info['protocol']
        )
        key_tuple, direction = fk.get_key_and_direction()
        
        if key_tuple not in self.active_flows:
            flow_data = FlowData(key_tuple, now)
            flow_data.initiator_ip = pkt_info['src_ip']
            self.active_flows[key_tuple] = flow_data
            
        flow = self.active_flows[key_tuple]
        flags = pkt_info.get('flags', {})
        header_len = pkt_info.get('header_len', 20)
        pkt_len = pkt_info.get('length', 60)
        
        flow.add_packet(pkt_len, direction, flags, now, header_len)
        
        # Evict on FIN/RST or timeout
        if flags.get('FIN') or flags.get('RST'):
            completed_flows.append(self.active_flows.pop(key_tuple))
            
        # Periodic cleanup instead of per-packet (fixes O(n) issue)
        if now - self.last_cleanup_time > (self.idle_timeout_sec / 2):
            keys_to_remove = []
            for k, f in list(self.active_flows.items()):
                if k == key_tuple:
                    continue
                if (now - f.last_time) >= self.idle_timeout_sec:
                    keys_to_remove.append(k)
                    
            for k in keys_to_remove:
                completed_flows.append(self.active_flows.pop(k))
            self.last_cleanup_time = now
            
        return completed_flows
