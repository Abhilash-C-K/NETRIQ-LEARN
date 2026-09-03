"""
backend/live_monitor/heuristic_fallback.py

Deterministic Heuristic Fallback Tier for NETRIQ's Dual-Layer NIDS architecture.
Evaluates raw packet metadata when the primary ML feature extraction or inference pipeline fails/times out.
"""

import time
from typing import Any, Dict, List, Optional, Set
from pydantic import BaseModel, Field

from backend.config import config
from backend.ai.contracts import HeuristicVerdict
from backend.utils.logger import get_logger

logger = get_logger(__name__)

_SENSITIVE_PORTS: Set[int] = set(getattr(config, "HEURISTIC_SENSITIVE_PORTS", [22, 88, 3389, 3306, 5432, 5985]))
_CONFIDENCE_FLOOR: float = float(getattr(config, "HEURISTIC_CONFIDENCE_FLOOR", 75.0))


class HeuristicFallback:
    """
    Evaluates 5 deterministic heuristic rules against raw packet metadata when the primary
    ML extraction/inference pipeline fails.
    """

    def __init__(self):
        pass

    def evaluate(self, raw_data: Dict[str, Any], timestamp: Optional[float] = None) -> HeuristicVerdict:
        now = timestamp if timestamp is not None else time.time()
        matched_rules: List[str] = []

        if not isinstance(raw_data, dict):
            logger.warning("[HeuristicFallback] Non-dict raw_data passed. Failing safely to no-escalation verdict.")
            return HeuristicVerdict.model_construct(
                matched_rules=[],
                escalate=False,
                confidence_floor=0.0,
                reason="Invalid raw data format",
                timestamp=now,
            )

        # Execute each rule safely
        rules = [
            self._check_sensitive_port_malformed_payload,
            self._check_packet_length_header_mismatch,
            self._check_tcp_invalid_flag_combinations,
            self._check_raw_packet_rate_spike,
            self._check_suspicious_small_packet_burst,
        ]

        for rule in rules:
            try:
                rule_name = rule(raw_data)
                if rule_name:
                    matched_rules.append(rule_name)
            except Exception as e:
                logger.debug(f"[HeuristicFallback] Rule evaluation error in {rule.__name__}: {e}")

        if matched_rules:
            floor = _CONFIDENCE_FLOOR
            reason = f"Heuristic escalation triggered by rule(s): {', '.join(matched_rules)}"
            if logger.isEnabledFor(30):
                logger.warning(f"[HEURISTIC_FALLBACK] {reason} (confidence_floor={floor:.1f}%)")
            return HeuristicVerdict.model_construct(
                matched_rules=matched_rules,
                escalate=True,
                confidence_floor=floor,
                reason=reason,
                timestamp=now,
            )

        return HeuristicVerdict.model_construct(
            matched_rules=[],
            escalate=False,
            confidence_floor=0.0,
            reason="Zero heuristic rules matched",
            timestamp=now,
        )

    # ------------------------------------------------------------------
    # Rule 1: Sensitive Port + Malformed Payload
    # ------------------------------------------------------------------
    def _check_sensitive_port_malformed_payload(self, raw_data: Dict[str, Any]) -> Optional[str]:
        """
        Rule 1: Targets sensitive management/database ports with malformed payloads or length mismatches.
        """
        dst_port = raw_data.get("dst_port") or raw_data.get("bwd_port") or raw_data.get("port")
        if dst_port is None:
            return None

        try:
            dst_port = int(dst_port)
        except (ValueError, TypeError):
            return None

        if dst_port not in _SENSITIVE_PORTS:
            return None

        is_malformed = bool(raw_data.get("is_malformed", False))
        payload_len = raw_data.get("payload_len")
        raw_len = raw_data.get("raw_len", 0)

        # Malformed payload flag set or raw length is non-zero but payload_len is corrupted/negative
        if is_malformed or (payload_len is not None and int(payload_len) < 0):
            return "Rule1_SensitivePortMalformedPayload"

        # Additional check: payload larger than raw packet frame length
        if payload_len is not None and raw_len > 0 and int(payload_len) > int(raw_len):
            return "Rule1_SensitivePortMalformedPayload"

        return None

    # ------------------------------------------------------------------
    # Rule 2: Header-to-Payload Length Mismatch
    # ------------------------------------------------------------------
    def _check_packet_length_header_mismatch(self, raw_data: Dict[str, Any]) -> Optional[str]:
        """
        Rule 2: Header claims more bytes than captured buffer or IP header length is illegal (<20 bytes).
        """
        raw_len = raw_data.get("raw_len") or raw_data.get("pkt_len")
        cap_len = raw_data.get("cap_len")
        ip_header_len = raw_data.get("ip_header_len") or raw_data.get("ip_hdr_len")

        if ip_header_len is not None:
            try:
                if int(ip_header_len) < 20:  # IPv4 min header length is 20 bytes
                    return "Rule2_PacketLengthHeaderMismatch"
            except (ValueError, TypeError):
                pass

        if raw_len is not None and cap_len is not None:
            try:
                # If header/packet length claims significantly more than captured bytes
                if int(raw_len) > int(cap_len) + 14:  # 14 bytes ethernet overhead tolerance
                    return "Rule2_PacketLengthHeaderMismatch"
            except (ValueError, TypeError):
                pass

        if bool(raw_data.get("header_length_mismatch", False)):
            return "Rule2_PacketLengthHeaderMismatch"

        return None

    # ------------------------------------------------------------------
    # Rule 3: Invalid TCP Flag Combinations
    # ------------------------------------------------------------------
    def _check_tcp_invalid_flag_combinations(self, raw_data: Dict[str, Any]) -> Optional[str]:
        """
        Rule 3: TCP flags show illegal scans (NULL scan: 0, Xmas scan: FIN+PSH+URG, SYN+FIN, SYN+RST).
        """
        protocol = str(raw_data.get("protocol", "")).upper()
        if protocol not in ("TCP", "6", "6.0"):
            if "tcp_flags" not in raw_data:
                return None

        flags = raw_data.get("tcp_flags")
        if flags is None:
            return None

        if isinstance(flags, dict):
            syn = bool(flags.get("SYN"))
            fin = bool(flags.get("FIN"))
            rst = bool(flags.get("RST"))
            psh = bool(flags.get("PSH"))
            urg = bool(flags.get("URG"))
            ack = bool(flags.get("ACK"))
        elif isinstance(flags, (int, float)):
            val = int(flags)
            fin = bool(val & 0x01)
            syn = bool(val & 0x02)
            rst = bool(val & 0x04)
            psh = bool(val & 0x08)
            ack = bool(val & 0x10)
            urg = bool(val & 0x20)
        else:
            return None

        # 1. NULL scan: No flags set at all
        if not (syn or fin or rst or psh or ack or urg):
            return "Rule3_InvalidTCPFlagCombinations"

        # 2. Xmas scan: FIN + PSH + URG
        if fin and psh and urg:
            return "Rule3_InvalidTCPFlagCombinations"

        # 3. Illegal pairs: SYN + FIN, SYN + RST
        if (syn and fin) or (syn and rst):
            return "Rule3_InvalidTCPFlagCombinations"

        return None

    # ------------------------------------------------------------------
    # Rule 4: Raw Packet Rate Spike (With Bulk File Transfer Guard)
    # ------------------------------------------------------------------
    def _check_raw_packet_rate_spike(self, raw_data: Dict[str, Any]) -> Optional[str]:
        """
        Rule 4: Packet rate from single IP exceeds HEURISTIC_PACKET_RATE_THRESHOLD (default 1000 pps).
        Includes bulk file transfer protection.
        """
        pkt_rate = raw_data.get("pkt_rate") or raw_data.get("flow_pkts_per_sec") or raw_data.get("packets_per_sec")
        if pkt_rate is None:
            return None

        try:
            rate = float(pkt_rate)
            threshold = getattr(config, "HEURISTIC_PACKET_RATE_THRESHOLD", getattr(config, "HEURISTIC_RATE_SPIKE_THRESHOLD", 1000.0))
            if rate >= threshold:
                avg_pkt_size = raw_data.get("avg_pkt_size") or raw_data.get("pkt_len") or raw_data.get("Average Packet Size", 0.0)
                duration = raw_data.get("flow_duration_sec") or raw_data.get("duration_sec") or (float(raw_data.get("Flow Duration", 0.0)) / 1e6)
                sustained_req = getattr(config, "HEURISTIC_SUSTAINED_DURATION_SEC", 2.0)

                try:
                    size = float(avg_pkt_size)
                    dur = float(duration)
                    if size >= 800.0 and dur > 0.0 and dur < sustained_req:
                        logger.debug(f"[HeuristicFallback] Suppressing Rule 4 false positive: bursty bulk transfer (size={size:.0f}B, dur={dur:.2f}s)")
                        return None
                except (ValueError, TypeError):
                    pass

                return "Rule4_RawPacketRateSpike"
        except (ValueError, TypeError):
            pass

        return None

    # ------------------------------------------------------------------
    # Rule 5: Suspicious Micro-Packet Control Burst
    # ------------------------------------------------------------------
    def _check_suspicious_small_packet_burst(self, raw_data: Dict[str, Any]) -> Optional[str]:
        """
        Rule 5: High burst count of tiny packets (<64 bytes) without payload.
        """
        pkt_len = raw_data.get("pkt_len") or raw_data.get("raw_len") or raw_data.get("length")
        if pkt_len is None:
            return None

        try:
            length = int(pkt_len)
        except (ValueError, TypeError):
            return None

        burst_count = raw_data.get("small_pkt_burst_count", 0)
        pkt_rate = raw_data.get("pkt_rate", 0)

        # Micro-packet burst trigger criteria: packet length <64 AND (burst count > 50 or packet rate > 100 pps with TCP SYN/RST)
        if length < 64:
            if burst_count > 50:
                return "Rule5_SuspiciousSmallPacketBurst"
            if pkt_rate > 100:
                flags = raw_data.get("tcp_flags")
                if flags is not None:
                    return "Rule5_SuspiciousSmallPacketBurst"

        return None
