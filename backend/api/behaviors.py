from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.auth.roles import Capabilities, get_request_role
from backend.auth.permissions import require_permission
from backend.database.device_behavior_repo import device_behaviors_repo
from backend.services.behavior_service import behavior_engine
from backend.utils.logger import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/behaviors", tags=["behaviors"])

class UpdateProfilePolicyReq(BaseModel):
    role: Optional[str] = None
    active_start_hour: Optional[int] = None
    active_end_hour: Optional[int] = None
    active_days: Optional[List[int]] = None
    allowed_destinations: Optional[List[str]] = None
    restricted_internal_subnets: Optional[List[str]] = None
    forbidden_ports: Optional[List[int]] = None

@router.get("", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def list_device_behaviors():
    """Returns all tracked device profiles and behavioral baselines with zero duplication."""
    try:
        await device_behaviors_repo.ensure_indexes()
        docs = await device_behaviors_repo.list(limit=200, sort_by=[("last_seen", -1)])
        return docs
    except Exception as e:
        logger.error(f"Failed to list device behaviors: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to retrieve device profiles")

@router.get("/{identifier}", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def get_device_behavior(identifier: str):
    """Retrieves profile by MAC address or IP."""
    try:
        # Check by MAC first, then by IP
        profile = await device_behaviors_repo.get_by_mac(identifier)
        if not profile:
            profile = await device_behaviors_repo.get_by_ip(identifier)
        if not profile:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device profile not found")
        return profile
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to retrieve profile for {identifier}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to fetch profile")

@router.patch("/{mac}", dependencies=[Depends(require_permission(Capabilities.MANAGE_SETTINGS))])
async def update_device_policy(mac: str, req: UpdateProfilePolicyReq):
    """Allows Admin to tune a device's baseline operating hours and allowed/forbidden destinations."""
    try:
        doc = await device_behaviors_repo.get_by_mac(mac)
        if not doc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found")

        updates: Dict[str, Any] = {}
        if req.role:
            updates["role"] = req.role

        # Update time profile
        time_prof = doc.get("time_profile", {})
        if req.active_start_hour is not None:
            time_prof["active_start_hour"] = req.active_start_hour
        if req.active_end_hour is not None:
            time_prof["active_end_hour"] = req.active_end_hour
        if req.active_days is not None:
            time_prof["active_days"] = req.active_days
        updates["time_profile"] = time_prof

        # Update network policy
        net_pol = doc.get("network_policy", {})
        if req.allowed_destinations is not None:
            net_pol["allowed_destinations"] = req.allowed_destinations
        if req.restricted_internal_subnets is not None:
            net_pol["restricted_internal_subnets"] = req.restricted_internal_subnets
        if req.forbidden_ports is not None:
            net_pol["forbidden_ports"] = req.forbidden_ports
        updates["network_policy"] = net_pol

        await device_behaviors_repo.collection.update_one(
            {"mac": mac.upper()},
            {"$set": updates}
        )
        # Invalidate in-memory engine cache so new policy takes effect immediately
        behavior_engine._profile_cache.pop(mac.upper(), None)
        if "current_ip" in doc:
            behavior_engine._profile_cache.pop(doc["current_ip"], None)

        updated = await device_behaviors_repo.get_by_mac(mac)
        return updated
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update device policy: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to update device policy")

@router.post("/simulate-anomaly", dependencies=[Depends(require_permission(Capabilities.VIEW_SMART_SUMMARY))])
async def simulate_behavioral_anomaly(payload: dict):
    """
    Test endpoint for live SOC demonstration.
    Simulates a device violating its operating hours or attempting lateral SMB/SSH scanning.
    """
    try:
        target_ip = payload.get("ip", "192.168.10.15")
        target_mac = payload.get("mac", "88:B1:11:A4:2F:90")
        target_hostname = payload.get("hostname", "Workstation-Demo")
        anomaly_type = payload.get("type", "LATERAL_SMB")

        # Ensure base profile exists
        profile = await behavior_engine.get_or_create_profile(target_ip, target_mac, target_hostname)

        # Formulate violation based on simulated type
        if anomaly_type == "OUT_OF_HOURS":
            violations = ["Out-of-hours activity: Transmitting at 03:15 AM (Operating schedule: 08:00-20:00)"]
            dst_ip = "192.168.10.1"
            dst_port = 443
        elif anomaly_type == "RESTRICTED_ACCESS":
            violations = ["Attempted access to restricted confidential internal asset: 192.168.10.50 (Crown Jewel DB)"]
            dst_ip = "192.168.10.50"
            dst_port = 1433
        else: # LATERAL_SMB
            violations = ["Unauthorized lateral movement attempt targeting 192.168.10.22 on forbidden port 445 (SMB/Lateral)"]
            dst_ip = "192.168.10.22"
            dst_port = 445

        alert = await behavior_engine._handle_anomaly(
            profile=profile,
            src_ip=target_ip,
            mac=target_mac,
            hostname=target_hostname,
            dst_ip=dst_ip,
            dst_port=dst_port,
            violations=violations
        )
        return {"status": "success", "alert": alert}
    except Exception as e:
        logger.error(f"Failed to simulate behavioral anomaly: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to trigger simulation")

class AgentHeartbeatReq(BaseModel):
    mac: str
    ip: str
    hostname: str
    os: Optional[str] = None
    logged_in_user: Optional[str] = None
    active_processes_count: Optional[int] = None
    sample_processes: Optional[List[str]] = None
    suspicious_processes: Optional[List[str]] = None
    timestamp: Optional[float] = None


@router.post("/agent-heartbeat")
async def receive_agent_heartbeat(payload: AgentHeartbeatReq):
    """
    Ingests live telemetry from the lightweight NetrIQ Endpoint Agent installed on client laptops.
    Records active logged-in user, running processes, and checks if quarantine is active.
    """
    try:
        mac = payload.mac.upper()
        # 1. Update/Ensure base profile exists in MongoDB with live agent data
        profile = await behavior_engine.get_or_create_profile(
            ip=payload.ip,
            mac=mac,
            hostname=payload.hostname
        )

        now_ts = payload.timestamp or time.time()
        agent_fields = {
            "last_seen": now_ts,
            "current_ip": payload.ip,
            "hostname": payload.hostname,
            "os_environment": payload.os,
            "logged_in_user": payload.logged_in_user,
            "active_processes_count": payload.active_processes_count,
            "sample_processes": payload.sample_processes or [],
            "suspicious_processes": payload.suspicious_processes or [],
            "agent_active": True,
            "last_agent_heartbeat": now_ts
        }

        # 2. If agent spotted suspicious hacking/recon tools (mimikatz, nmap, etc.) on the machine
        if payload.suspicious_processes:
            proc_list = ", ".join(payload.suspicious_processes)
            violations = [f"Blacklisted process running on host: {proc_list}"]
            await behavior_engine._handle_anomaly(
                profile=profile,
                src_ip=payload.ip,
                mac=mac,
                hostname=payload.hostname,
                dst_ip="localhost",
                dst_port=0,
                violations=violations
            )

        # Update MongoDB document
        await device_behaviors_repo.collection.update_one(
            {"mac": mac},
            {"$set": agent_fields}
        )

        # Check if SOC Admin has quarantined this device
        is_quar = (profile.get("status") == "QUARANTINED")
        quar_reason = profile.get("quarantine_reason", "Quarantined by SOC Admin")

        return {
            "status": "success",
            "is_quarantined": is_quar,
            "quarantine_reason": quar_reason if is_quar else None,
            "server_time": time.time()
        }
    except Exception as e:
        logger.error(f"Failed to ingest agent heartbeat from {payload.mac}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Agent heartbeat processing failed")

