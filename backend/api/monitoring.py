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

