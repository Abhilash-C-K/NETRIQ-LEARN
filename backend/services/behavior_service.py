import time
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, List, Tuple
from backend.utils.logger import get_logger
from backend.utils.validators import is_internal_ip
from backend.database.device_behavior_repo import device_behaviors_repo
from backend.websocket.events import BehaviorAlertEvent, NewIncidentEvent
from backend.websocket.broadcaster import broadcaster
from backend.database.collections import incidents_repo

logger = get_logger(__name__)

class BehaviorEngine:
    """
    Layer 2 Behavior & Anomaly Baselining Engine (UEBA).
    Monitors internal systems against their baseline profiles.
    Detects:
      1. Out-of-hours activity (Time anomaly)
      2. Lateral movement to forbidden internal servers/subnets
      3. Probing forbidden ports (SSH 22, SMB 445, RDP 3389, SQL 1433)
      4. Dynamic baseline learning with zero duplication.
    """
    def __init__(self):
        # In-memory fast cache to minimize DB read latency on high-throughput packet streams
        self._profile_cache: Dict[str, Dict[str, Any]] = {}
        self._last_alert_time: Dict[str, float] = {}  # Throttle duplicate alerts per device (1 per 15s)

    async def get_or_create_profile(self, ip: str, mac: Optional[str] = None, hostname: Optional[str] = None) -> Dict[str, Any]:
        """Fetches profile from cache or database; seeds realistic baseline if new."""
        lookup_key = mac.upper() if mac else ip
        if lookup_key in self._profile_cache:
            return self._profile_cache[lookup_key]

        # Check DB by MAC first, then by IP
        doc = None
        if mac:
            doc = await device_behaviors_repo.get_by_mac(mac)
        if not doc and ip:
            doc = await device_behaviors_repo.get_by_ip(ip)

        if not doc:
            # Seed profile based on discovered identity
            synthetic_mac = mac.upper() if mac else f"STATIC:{ip}"
            dev_hostname = hostname or f"Device ({ip})"
            
            # Infer role dynamically without hardcoding
            lower_name = dev_hostname.lower()
            if any(k in lower_name for k in ["router", "gateway", "gw"]) or ip.endswith(".1"):
                role = "router"
            elif any(k in lower_name for k in ["server", "db", "nas", "storage", "dc", "portal"]):
                role = "server"
            else:
                role = "workstation"

            # Workstations have standard working hours and are forbidden from probing administrative ports
            initial_profile = {
                "mac": synthetic_mac,
                "current_ip": ip,
                "hostname": dev_hostname,
                "role": role,
                "time_profile": {
                    "active_start_hour": 8,
                    "active_end_hour": 20,
                    "active_days": [1, 2, 3, 4, 5],
                    "total_sessions_tracked": 1
                },
                "network_policy": {
                    "allowed_destinations": [],
                    "restricted_internal_subnets": [],
                    "allowed_outbound_ports": [80, 443, 53, 123, 8080],
                    "forbidden_ports": [22, 445, 3389, 1433, 135] if role == "workstation" else []
                }
            }
            doc = await device_behaviors_repo.upsert_device(synthetic_mac, initial_profile)

        self._profile_cache[lookup_key] = doc
        return doc

    async def inspect_internal_flow(self, flow: Any) -> Optional[Dict[str, Any]]:
        """
        Evaluates an observed internal flow against source system's behavioral baseline.
        Returns alert payload if abnormal behavior is detected, else None.
        """
        src_ip = getattr(flow, 'src_ip', '')
        dst_ip = getattr(flow, 'dst_ip', '')
        dst_port = getattr(flow, 'dst_port', 0)
        src_mac = getattr(flow, 'src_mac', None)

        # Only evaluate if traffic originates from an internal system
        if not is_internal_ip(src_ip):
            return None

        # Fetch system profile
        profile = await self.get_or_create_profile(src_ip, src_mac)
        mac = profile.get("mac", src_mac or src_ip)
        hostname = profile.get("hostname", src_ip)
        role = profile.get("role", "workstation")
        policy = profile.get("network_policy", {})
        time_prof = profile.get("time_profile", {})

        # If already quarantined, no need to raise new alerts
        if profile.get("status") == "QUARANTINED":
            return None

        violations: List[str] = []
        now = datetime.now()
        current_hour = now.hour
        current_weekday = now.isoweekday()  # 1 = Mon, 7 = Sun

        # --- RULE 1: Time-of-Day Anomaly (Out-of-Hours Activity) ---
        start_hour = time_prof.get("active_start_hour", 8)
        end_hour = time_prof.get("active_end_hour", 20)
        allowed_days = time_prof.get("active_days", [1, 2, 3, 4, 5])

        if role == "workstation":
            # Check if active outside normal operating schedule
            is_off_hours = (current_hour < start_hour or current_hour >= end_hour)
            is_off_day = (current_weekday not in allowed_days)
            if is_off_hours or is_off_day:
                time_str = f"{current_hour:02d}:{now.minute:02d}"
                violations.append(
                    f"Out-of-hours activity: Transmitting at {time_str} (Operating schedule: {start_hour:02d}:00-{end_hour:02d}:00)"
                )

        # --- RULE 2: Lateral Movement to Forbidden Ports (e.g. SMB 445, SSH 22, RDP 3389) ---
        forbidden_ports = policy.get("forbidden_ports", [22, 445, 3389, 1433, 135])
        is_lateral = is_internal_ip(dst_ip)
        if is_lateral and dst_port in forbidden_ports:
            port_labels = {22: "SSH", 445: "SMB/Lateral", 3389: "RDP", 1433: "MSSQL", 135: "RPC"}
            label = port_labels.get(dst_port, str(dst_port))
            violations.append(
                f"Unauthorized lateral movement attempt targeting {dst_ip} on forbidden port {dst_port} ({label})"
            )

        # --- RULE 3: Restricted Destination / Internal Server Breach ---
        restricted_targets = policy.get("restricted_internal_subnets", [])
        if dst_ip in restricted_targets:
            violations.append(
                f"Attempted access to restricted confidential internal asset: {dst_ip}"
            )

        # If violations found, trigger alert and log event
        if violations:
            return await self._handle_anomaly(profile, src_ip, mac, hostname, dst_ip, dst_port, violations)

        # If clean and normal: dynamically learn the destination into allowed whitelist
        if dst_ip and not is_internal_ip(dst_ip):
            try:
                # Add to set without duplication
                await device_behaviors_repo.collection.update_one(
                    {"mac": mac},
                    {"$addToSet": {"network_policy.allowed_destinations": dst_ip}}
                )
            except Exception:
                pass

        return None

    async def _handle_anomaly(
        self,
        profile: Dict[str, Any],
        src_ip: str,
        mac: str,
        hostname: str,
        dst_ip: str,
        dst_port: int,
        violations: List[str]
    ) -> Dict[str, Any]:
        """Logs deviation in MongoDB and broadcasts an instant action alert to the Admin."""
        now_ts = time.time()
        throttle_key = f"{mac}:{violations[0]}"
        last_alert = self._last_alert_time.get(throttle_key, 0)
        
        # Throttle duplicate alerts to SOC admin (max 1 every 15s per device/violation type)
        is_throttled = (now_ts - last_alert) < 15.0
        self._last_alert_time[throttle_key] = now_ts

        violation_summary = " | ".join(violations)
        logger.warning(
            f"[BehaviorEngine][LAYER_2_ANOMALY] System '{hostname}' ({src_ip}) deviated from baseline! "
            f"Violations: {violation_summary}"
        )

        violation_doc = {
            "type": "BEHAVIORAL_DEVIATION",
            "details": violation_summary,
            "dst_ip": dst_ip,
            "dst_port": dst_port,
            "severity": "CRITICAL" if any("lateral" in v.lower() for v in violations) else "HIGH",
        }

        # 1. Update MongoDB with sliding capped window
        await device_behaviors_repo.log_violation(
            mac=mac,
            violation=violation_doc,
            new_status="COMPROMISED",
            anomaly_score=0.92
        )

        # Update in-memory profile cache
        profile["status"] = "COMPROMISED"
        profile["anomaly_score"] = 0.92

        # 2. Construct Alert Event Payload
        alert_payload = {
            "device_ip": src_ip,
            "device_mac": mac,
            "hostname": hostname,
            "severity": violation_doc["severity"],
            "title": "Abnormal System Behavior Detected",
            "message": f"System '{hostname}' ({src_ip}) exhibited abnormal behavior: {violations[0]}. Immediate quarantine recommended.",
            "violations": violations,
            "timestamp": now_ts,
            "recommended_action": "QUARANTINE",
            "quarantine_ready": True
        }

        # 3. Create SOC Incident in MongoDB
        incident_doc = {
            "timestamp": now_ts,
            "created_at": now_ts,
            "severity": violation_doc["severity"],
            "status": "OPEN",
            "title": f"L2 Behavior Anomaly: {hostname}",
            "description": f"Internal system '{hostname}' ({src_ip}) violated behavior baseline: {violation_summary}. Admin quarantine recommended.",
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "src_port": 0,
            "dst_port": dst_port,
            "protocol": "TCP",
            "affected_assets": [src_ip, hostname],
            "response_action": "RECOMMEND_QUARANTINE",
            "response_success": None,
            "notes": "Generated by Layer 2 Host Behavior Engine (UEBA)"
        }
        try:
            inc_id = await incidents_repo.create(incident_doc)
            incident_doc["id"] = inc_id
            alert_payload["incident_id"] = inc_id
        except Exception as e:
            logger.warning(f"Could not log behavioral incident: {e}")

        # 4. Broadcast instant WebSocket alert to Admin / SOC Console
        if not is_throttled:
            try:
                await broadcaster.publish(BehaviorAlertEvent(payload=alert_payload))
                await broadcaster.publish(NewIncidentEvent(payload=incident_doc))
            except Exception as b_err:
                logger.warning(f"Failed to broadcast behavior alert: {b_err}")

        return alert_payload

behavior_engine = BehaviorEngine()

