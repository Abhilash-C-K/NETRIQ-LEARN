from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.schemas.monitoring import MonitorStatus
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.services.monitoring_service import monitoring_service
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/monitoring", tags=["monitoring"])


@router.post("/start", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def start_monitoring(req: Request):
    try:
        await monitoring_service.start(get_request_role(req))
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to start monitoring: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to start monitoring")


@router.post("/stop", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def stop_monitoring(req: Request):
    try:
        await monitoring_service.stop(get_request_role(req))
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to stop monitoring: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to stop monitoring")


@router.get("/status", response_model=MonitorStatus, dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_status():
    try:
        return MonitorStatus.model_validate(monitoring_service.get_status())
    except Exception as e:
        logger.error(f"Failed to get monitoring status: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to get monitoring status")


@router.get("/telemetry", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_network_telemetry():
    try:
        from backend.services.network_telemetry_service import network_telemetry_service
        return await network_telemetry_service.get_telemetry()
    except Exception as e:
        logger.error(f"Failed to get network telemetry: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve network telemetry")


@router.get("/local-topology", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_local_topology():
    """Returns actual real devices discovered on the active local network interface via ARP and system routing."""
    try:
        return monitoring_service.get_local_topology()
    except Exception as e:
        logger.error(f"Failed to get local network topology: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to discover local network topology")


@router.get("/resolve-dns", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def resolve_ip_dns(ip: str):
    """Dynamically resolves any IP (Source or Destination) to its domain name via real reverse DNS."""
    try:
        from backend.services.dns_resolver import dns_resolver
        domain = dns_resolver.resolve_ip_sync(ip, timeout=2.5)
        return {"ip": ip, "domain": domain}
    except Exception as e:
        logger.debug(f"Failed to reverse resolve IP {ip}: {e}")
        return {"ip": ip, "domain": None}


@router.post("/resolve-dns-batch", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def resolve_ip_dns_batch(payload: dict):
    """Dynamically resolves a batch of IPs to domain names via real parallel reverse DNS."""
    try:
        from backend.services.dns_resolver import dns_resolver
        ips = payload.get("ips", [])
        results = dns_resolver.resolve_batch_sync(ips)
        return {"results": results}
    except Exception as e:
        logger.debug(f"Batch DNS resolution failed: {e}")
        return {"results": {}}


class ThreatSimulationRequest(BaseModel):
    threat_type: str = "SYN_FLOOD"  # SYN_FLOOD, PORT_SCAN, LATERAL_SMB, MALWARE_C2
    src_ip: Optional[str] = None
    dst_ip: Optional[str] = None


@router.post("/simulate-threat", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def simulate_threat(req: ThreatSimulationRequest):
    """
    Simulates a live attack event on the wire for SOC demonstration and threat pipeline verification.
    Broadcasts LiveVerdictEvent and NewIncidentEvent across all connected WebSockets in real time.
    """
    import time
    from backend.database.collections import threats_repo, incidents_repo
    from backend.websocket.broadcaster import broadcaster
    from backend.websocket.events import LiveVerdictEvent, NewIncidentEvent

    host_ip, gateway_ip = monitoring_service._get_network_endpoints()
    t_type = (req.threat_type or "SYN_FLOOD").upper()

    if t_type == "PORT_SCAN":
        src = req.src_ip or "192.168.1.73"
        dst = req.dst_ip or host_ip
        pred = "Rapid Sequential Port Scan & Reconnaissance"
        sev = "HIGH"
        action = "RECOMMEND_BLOCK"
        proto = "TCP"
        dport = 445
        is_internal = True
        reason = "Automated port scan detected probing multiple destination ports"
    elif t_type in ("LATERAL_SMB", "LATERAL"):
        src = req.src_ip or "192.168.1.75"
        dst = req.dst_ip or host_ip
        pred = "Unauthorized Lateral Movement via SMB"
        sev = "HIGH"
        action = "QUARANTINE"
        proto = "TCP"
        dport = 445
        is_internal = True
        reason = "High-frequency SMB and RPC connection storm across internal subnet"
    elif t_type in ("MALWARE_C2", "MALWARE"):
        src = req.src_ip or host_ip
        dst = req.dst_ip or "185.220.101.5"
        pred = "C2 Beaconing & Data Exfiltration"
        sev = "CRITICAL"
        action = "RECOMMEND_BLOCK"
        proto = "TCP"
        dport = 8443
        is_internal = False
        reason = "Periodic beaconing pattern matching CobaltStrike C2 staging"
    else:  # SYN_FLOOD default
        src = req.src_ip or "185.220.101.5"
        dst = req.dst_ip or host_ip
        pred = "SYN Flood Volumetric DDoS Attack"
        sev = "CRITICAL"
        action = "RECOMMEND_BLOCK"
        proto = "TCP"
        dport = 80
        is_internal = False
        reason = "Surge of unacknowledged SYN packets exceeding baseline threshold"

    threat_doc = {
        "src_ip": src,
        "dst_ip": dst,
        "src_port": 54321,
        "dst_port": dport,
        "protocol": proto,
        "timestamp": time.time(),
        "prediction": pred,
        "confidence": 0.965,
        "severity": sev,
        "action": action,
        "is_anomaly": True,
        "is_internal": is_internal,
        "reason": reason,
        "raw_data": {
            "flow_duration": 0.05,
            "packet_count": 850,
            "byte_count": 450000,
            "explanation": [
                {
                    "feature": "packet_rate",
                    "plainTitle": "Flow Packet Velocity",
                    "value": "850 pkts/s",
                    "baseline": "15 pkts/s",
                    "impact": 0.42,
                    "direction": "increases_risk",
                    "explanation": "Volumetric packet surge triggered network anomaly baseline violation."
                },
                {
                    "feature": "tcp_syn_ratio",
                    "plainTitle": "Unacknowledged SYN Ratio",
                    "value": "96.4%",
                    "baseline": "< 2%",
                    "impact": 0.38,
                    "direction": "increases_risk",
                    "explanation": "Missing 3-way handshake ACK responses indicative of resource exhaustion."
                }
            ]
        }
    }

    try:
        threat_id = await threats_repo.create(threat_doc)
        threat_doc["id"] = threat_id

        # Also create corresponding incident record
        inc_doc = {
            "status": "active",
            "severity": sev,
            "description": f"AI Engine Flagged: {pred} from {src}",
            "created_at": time.time(),
            "updated_at": time.time(),
            "affected_assets": [src, dst],
            "src_ip": src,
            "dst_ip": dst,
            "confidence": 0.965,
            "response_action": "quarantine" if action == "QUARANTINE" else "block",
            "response_success": True
        }
        inc_id = await incidents_repo.create(inc_doc)
        inc_doc["id"] = inc_id

        # Broadcast live verdict and incident over WebSocket
        await broadcaster.publish(LiveVerdictEvent(payload=threat_doc))
        await broadcaster.publish(NewIncidentEvent(payload=inc_doc))

        logger.info(f"Simulated live threat '{pred}' (Threat: {threat_id}, Incident: {inc_id})")
        return {
            "status": "success",
            "threat_id": threat_id,
            "incident_id": inc_id,
            "threat": threat_doc,
        }
    except Exception as e:
        logger.error(f"Failed to simulate threat: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Simulation failed: {e}")


