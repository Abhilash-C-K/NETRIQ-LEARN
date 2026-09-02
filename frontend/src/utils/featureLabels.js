/**
 * featureLabels.js
 * Static humanized dictionary mapping all 71 CICIDS2017 network feature names
 * to plain-language descriptions and context tooltips.
 */

export const FEATURE_LABELS = {
  'Flow Duration': {
    label: 'Connection Duration',
    description: 'Total duration of the TCP/UDP connection session',
    unit: 'µs',
  },
  'Total Fwd Packets': {
    label: 'Outbound Packet Count',
    description: 'Total number of packets sent from source host',
    unit: 'pkts',
  },
  'Total Backward Packets': {
    label: 'Inbound Response Packet Count',
    description: 'Total number of response packets received from destination',
    unit: 'pkts',
  },
  'Total Length of Fwd Packets': {
    label: 'Total Outbound Payload Size',
    description: 'Total bytes transmitted outbound by source host',
    unit: 'bytes',
  },
  'Total Length of Bwd Packets': {
    label: 'Total Inbound Payload Size',
    description: 'Total bytes received inbound from destination',
    unit: 'bytes',
  },
  'Fwd Packet Length Max': {
    label: 'Peak Outbound Packet Size',
    description: 'Maximum size of a single outbound packet',
    unit: 'bytes',
  },
  'Fwd Packet Length Min': {
    label: 'Minimum Outbound Packet Size',
    description: 'Minimum size of an outbound packet',
    unit: 'bytes',
  },
  'Fwd Packet Length Mean': {
    label: 'Average Outbound Packet Size',
    description: 'Mean size of outbound payload packets',
    unit: 'bytes',
  },
  'Fwd Packet Length Std': {
    label: 'Outbound Packet Size Variation',
    description: 'Standard deviation of outbound packet sizes',
    unit: 'bytes',
  },
  'Bwd Packet Length Max': {
    label: 'Peak Inbound Packet Size',
    description: 'Maximum size of a single inbound response packet',
    unit: 'bytes',
  },
  'Bwd Packet Length Min': {
    label: 'Minimum Inbound Packet Size',
    description: 'Minimum size of an inbound response packet',
    unit: 'bytes',
  },
  'Bwd Packet Length Mean': {
    label: 'Average Inbound Packet Size',
    description: 'Mean size of inbound response payload packets',
    unit: 'bytes',
  },
  'Bwd Packet Length Std': {
    label: 'Inbound Packet Size Variation',
    description: 'Standard deviation of inbound packet sizes',
    unit: 'bytes',
  },
  'Flow Bytes/s': {
    label: 'Network Data Throughput',
    description: 'Data transmission rate across connection',
    unit: 'B/s',
  },
  'Flow Packets/s': {
    label: 'Unusually High Packet Rate',
    description: 'Total packet transmission speed (indicator of flooding or DDoS)',
    unit: 'pkts/s',
  },
  'Flow IAT Mean': {
    label: 'Average Time Between Packets',
    description: 'Mean inter-arrival time across all packets in flow',
    unit: 'µs',
  },
  'Flow IAT Std': {
    label: 'Packet Inter-Arrival Variation',
    description: 'Variation in packet transmission timing',
    unit: 'µs',
  },
  'Flow IAT Max': {
    label: 'Maximum Packet Delay Gap',
    description: 'Longest delay between consecutive packets',
    unit: 'µs',
  },
  'Flow IAT Min': {
    label: 'Minimum Packet Delay Gap',
    description: 'Shortest delay between consecutive packets',
    unit: 'µs',
  },
  'Fwd IAT Total': {
    label: 'Total Outbound Inter-Arrival Time',
    description: 'Cumulative time between outbound packets',
    unit: 'µs',
  },
  'Fwd IAT Mean': {
    label: 'Outbound Packet Interval',
    description: 'Average time between outbound packets (scanner pattern indicator)',
    unit: 'µs',
  },
  'Fwd IAT Std': {
    label: 'Outbound Timing Variation',
    description: 'Standard deviation of outbound packet arrival timing',
    unit: 'µs',
  },
  'Fwd IAT Max': {
    label: 'Max Outbound Delay Gap',
    description: 'Longest delay between outbound packets',
    unit: 'µs',
  },
  'Fwd IAT Min': {
    label: 'Min Outbound Delay Gap',
    description: 'Shortest delay between outbound packets',
    unit: 'µs',
  },
  'Bwd IAT Total': {
    label: 'Total Inbound Inter-Arrival Time',
    description: 'Cumulative time between inbound response packets',
    unit: 'µs',
  },
  'Bwd IAT Mean': {
    label: 'Inbound Response Interval',
    description: 'Average time between inbound response packets',
    unit: 'µs',
  },
  'Bwd IAT Std': {
    label: 'Inbound Timing Variation',
    description: 'Standard deviation of inbound packet arrival timing',
    unit: 'µs',
  },
  'Bwd IAT Max': {
    label: 'Max Inbound Delay Gap',
    description: 'Longest delay between inbound response packets',
    unit: 'µs',
  },
  'Bwd IAT Min': {
    label: 'Min Inbound Delay Gap',
    description: 'Shortest delay between inbound response packets',
    unit: 'µs',
  },
  'Fwd PSH Flags': {
    label: 'Outbound Push Flag Triggers',
    description: 'Immediate data push requests sent outbound',
    unit: 'count',
  },
  'Bwd PSH Flags': {
    label: 'Inbound Push Flag Triggers',
    description: 'Immediate data push requests received inbound',
    unit: 'count',
  },
  'Fwd URG Flags': {
    label: 'Outbound Urgent Flags',
    description: 'Urgent priority flags in outbound TCP header',
    unit: 'count',
  },
  'Bwd URG Flags': {
    label: 'Inbound Urgent Flags',
    description: 'Urgent priority flags in inbound TCP header',
    unit: 'count',
  },
  'Fwd Header Length': {
    label: 'Outbound TCP Header Bytes',
    description: 'Total header bytes sent outbound',
    unit: 'bytes',
  },
  'Bwd Header Length': {
    label: 'Inbound TCP Header Bytes',
    description: 'Total header bytes received inbound',
    unit: 'bytes',
  },
  'Fwd Packets/s': {
    label: 'Outbound Packet Rate',
    description: 'Outbound transmission frequency',
    unit: 'pkts/s',
  },
  'Bwd Packets/s': {
    label: 'Inbound Response Packet Rate',
    description: 'Inbound response frequency',
    unit: 'pkts/s',
  },
  'Min Packet Length': {
    label: 'Smallest Packet Payload',
    description: 'Minimum packet size across entire flow',
    unit: 'bytes',
  },
  'Max Packet Length': {
    label: 'Largest Packet Payload',
    description: 'Maximum packet size across entire flow',
    unit: 'bytes',
  },
  'Packet Length Mean': {
    label: 'Average Packet Payload Size',
    description: 'Mean packet size across entire flow',
    unit: 'bytes',
  },
  'Packet Length Std': {
    label: 'Inconsistent Response Sizes',
    description: 'Variation in packet payload sizes (anomaly indicator)',
    unit: 'bytes',
  },
  'Packet Length Variance': {
    label: 'Payload Size Variance',
    description: 'Statistical variance of packet payload sizes',
    unit: 'var',
  },
  'FIN Flag Count': {
    label: 'FIN Connection Teardowns',
    description: 'Number of TCP FIN connection close signals',
    unit: 'count',
  },
  'SYN Flag Count': {
    label: 'SYN Connection Initiation Burst',
    description: 'Number of TCP SYN connection request flags (port scan indicator)',
    unit: 'count',
  },
  'RST Flag Count': {
    label: 'RST Connection Aborts',
    description: 'Number of TCP RST connection reset flags',
    unit: 'count',
  },
  'PSH Flag Count': {
    label: 'PSH Push Data Flags',
    description: 'Number of TCP PSH push payload flags',
    unit: 'count',
  },
  'ACK Flag Count': {
    label: 'ACK Acknowledgment Flags',
    description: 'Number of TCP ACK acknowledgment flags',
    unit: 'count',
  },
  'URG Flag Count': {
    label: 'URG Priority Flags',
    description: 'Number of TCP URG urgent priority flags',
    unit: 'count',
  },
  'CWR Flag Count': {
    label: 'CWR Congestion Flags',
    description: 'Number of Congestion Window Reduced flags',
    unit: 'count',
  },
  'ECE Flag Count': {
    label: 'ECE Congestion Echo Flags',
    description: 'Number of Explicit Congestion Notification flags',
    unit: 'count',
  },
  'Down/Up Ratio': {
    label: 'Inbound vs Outbound Ratio',
    description: 'Ratio of received response packets to sent packets',
    unit: 'ratio',
  },
  'Average Packet Size': {
    label: 'Mean Flow Packet Size',
    description: 'Average packet size computed over total flow',
    unit: 'bytes',
  },
  'Avg Fwd Segment Size': {
    label: 'Avg Outbound Segment Payload',
    description: 'Average size of outbound TCP data segments',
    unit: 'bytes',
  },
  'Avg Bwd Segment Size': {
    label: 'Avg Inbound Segment Payload',
    description: 'Average size of inbound TCP data segments',
    unit: 'bytes',
  },
  'Fwd Header Length.1': {
    label: 'Duplicate Fwd Header Specifier',
    description: 'Outbound TCP header byte duplicate feature',
    unit: 'bytes',
  },
  'Subflow Fwd Packets': {
    label: 'Subflow Outbound Packets',
    description: 'Outbound packet count within subflow window',
    unit: 'pkts',
  },
  'Subflow Fwd Bytes': {
    label: 'Subflow Outbound Bytes',
    description: 'Outbound byte count within subflow window',
    unit: 'bytes',
  },
  'Subflow Bwd Packets': {
    label: 'Subflow Inbound Packets',
    description: 'Inbound packet count within subflow window',
    unit: 'pkts',
  },
  'Subflow Bwd Bytes': {
    label: 'Subflow Inbound Bytes',
    description: 'Inbound byte count within subflow window',
    unit: 'bytes',
  },
  'Init_Win_bytes_forward': {
    label: 'Outbound TCP Window Size',
    description: 'Initial TCP window size offered by outbound sender',
    unit: 'bytes',
  },
  'Init_Win_bytes_backward': {
    label: 'Inbound TCP Window Size',
    description: 'Initial TCP window size offered by inbound receiver',
    unit: 'bytes',
  },
  'act_data_pkt_fwd': {
    label: 'Active Data Packets Outbound',
    description: 'Count of outbound packets carrying non-zero TCP payload data',
    unit: 'pkts',
  },
  'min_seg_size_forward': {
    label: 'Min Outbound TCP Segment Size',
    description: 'Minimum TCP segment size observed outbound',
    unit: 'bytes',
  },
  'Active Mean': {
    label: 'Mean Active Duration',
    description: 'Average active processing time before flow idle state',
    unit: 'µs',
  },
  'Active Std': {
    label: 'Active Duration Variation',
    description: 'Variation in active flow processing duration',
    unit: 'µs',
  },
  'Active Max': {
    label: 'Peak Active Duration',
    description: 'Maximum time flow remained continuously active',
    unit: 'µs',
  },
  'Active Min': {
    label: 'Minimum Active Duration',
    description: 'Shortest time flow remained active',
    unit: 'µs',
  },
  'Idle Mean': {
    label: 'Mean Inactivity Idle Time',
    description: 'Average idle duration between active flow bursts',
    unit: 'µs',
  },
  'Idle Std': {
    label: 'Idle Time Variation',
    description: 'Variation in inactivity idle time',
    unit: 'µs',
  },
  'Idle Max': {
    label: 'Peak Idle Inactivity',
    description: 'Longest continuous idle gap during session',
    unit: 'µs',
  },
  'Idle Min': {
    label: 'Minimum Idle Inactivity',
    description: 'Shortest idle gap during session',
    unit: 'µs',
  },
};

/**
 * Humanizes a feature name with fallback to raw name if missing.
 */
export const humanizeFeatureName = (rawName) => {
  if (FEATURE_LABELS[rawName]) {
    return FEATURE_LABELS[rawName].label;
  }
  return rawName;
};

/**
 * Gets humanized description & context for a feature.
 */
export const getFeatureMeta = (rawName) => {
  return (
    FEATURE_LABELS[rawName] || {
      label: rawName,
      description: `Raw feature: ${rawName}`,
      unit: '',
    }
  );
};
