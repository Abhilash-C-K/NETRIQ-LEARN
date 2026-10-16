import unittest
import time
from backend.live_monitor.flow_builder import FlowBuilder, FlowKey, FlowData


class TestFlowDirection(unittest.TestCase):
    def test_flow_direction_preserves_initiator_when_src_ip_greater_than_dst_ip(self):
        """
        Verify that when a friend (e.g. 192.168.1.85) sends packets to user (192.168.1.74),
        even though '192.168.1.85' > '192.168.1.74' lexicographically,
        the flow's src_ip is 192.168.1.85 and dst_ip is 192.168.1.74 (NOT inverted).
        """
        builder = FlowBuilder(idle_timeout_sec=1.0)
        now = time.time()

        friend_ip = "192.168.1.85"
        user_ip = "192.168.1.74"

        # Packet 1: Friend connects to User on port 80
        pkt1 = {
            'src_ip': friend_ip,
            'dst_ip': user_ip,
            'src_port': 54321,
            'dst_port': 80,
            'protocol': 'TCP',
            'length': 64,
            'header_len': 20,
            'flags': {'SYN': True},
            'timestamp': now
        }

        completed = builder.process_packet(pkt1)
        self.assertEqual(len(completed), 0)

        # Check active flow
        fk = FlowKey(friend_ip, user_ip, 54321, 80, 'TCP')
        key = fk.get_canonical_key()
        flow = builder.active_flows[key]

        self.assertEqual(flow.src_ip, friend_ip, "Source IP MUST be the friend who initiated the packet")
        self.assertEqual(flow.dst_ip, user_ip, "Destination IP MUST be the user receiving the packet")
        self.assertEqual(flow.src_port, 54321)
        self.assertEqual(flow.dst_port, 80)
        self.assertEqual(flow.fwd_packets, 1)
        self.assertEqual(flow.bwd_packets, 0)

        # Packet 2: User sends SYN-ACK back to Friend
        pkt2 = {
            'src_ip': user_ip,
            'dst_ip': friend_ip,
            'src_port': 80,
            'dst_port': 54321,
            'protocol': 'TCP',
            'length': 64,
            'header_len': 20,
            'flags': {'SYN': True, 'ACK': True},
            'timestamp': now + 0.01
        }
        builder.process_packet(pkt2)
        self.assertEqual(flow.fwd_packets, 1)
        self.assertEqual(flow.bwd_packets, 1)

        # Packet 3: Friend sends FIN to end flow
        pkt3 = {
            'src_ip': friend_ip,
            'dst_ip': user_ip,
            'src_port': 54321,
            'dst_port': 80,
            'protocol': 'TCP',
            'length': 54,
            'header_len': 20,
            'flags': {'FIN': True, 'ACK': True},
            'timestamp': now + 0.05
        }
        completed = builder.process_packet(pkt3)
        self.assertEqual(len(completed), 1)
        finished_flow = completed[0]

        self.assertEqual(finished_flow.src_ip, friend_ip)
        self.assertEqual(finished_flow.dst_ip, user_ip)
        self.assertEqual(finished_flow.src_port, 54321)
        self.assertEqual(finished_flow.dst_port, 80)


if __name__ == "__main__":
    unittest.main()
