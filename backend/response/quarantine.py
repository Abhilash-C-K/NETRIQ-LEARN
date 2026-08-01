"""
Quarantine Mechanism Integration
Assumption: Quarantine is implemented via an SDN (Software Defined Networking) API 
that moves the target MAC/IP into an isolated VLAN. This ensures unaffected systems 
keep running normally while the threat is isolated on the switch level.
"""

import os
import httpx
from httpx import HTTPStatusError, RequestError
from backend.utils.logger import get_logger
from backend.response.exceptions import QuarantineFailedError

logger = get_logger(__name__)

QUARANTINE_API_URL = os.getenv("QUARANTINE_API_URL", "https://sdn-controller.local/api/isolate")
QUARANTINE_API_KEY = os.getenv("QUARANTINE_API_KEY", "secret")
QUARANTINE_MODE = os.getenv("QUARANTINE_MODE", "noop").lower()

class QuarantineService:
    def __init__(self):
        self.base_url = QUARANTINE_API_URL
        self.headers = {
            "Authorization": f"Bearer {QUARANTINE_API_KEY}",
            "Content-Type": "application/json"
        }
        self.timeout = httpx.Timeout(3.0, connect=1.0)
        self.client = httpx.AsyncClient(headers=self.headers, timeout=self.timeout)

    async def quarantine_device(self, ip_address: str, mac_address: str, reason: str) -> bool:
        """
        Calls the SDN API to move the device to an isolation VLAN.
        """
        if QUARANTINE_MODE == "noop":
            logger.info(f"[NoOp Quarantine] MOCK ISOLATE issued for IP {ip_address} / MAC {mac_address} (Reason: {reason})")
            return True

        url = f"{self.base_url}/isolate"
        payload = {
            "ip_address": ip_address,
            "mac_address": mac_address,
            "reason": reason,
            "vlan": "ISOLATION_VLAN"
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.critical(f"SUCCESS: Device {ip_address} ({mac_address}) quarantined to isolation VLAN.")
            return True
        except (HTTPStatusError, RequestError) as e:
            logger.error(f"SDN API failed during quarantine for {ip_address}: {e}")
            raise QuarantineFailedError(f"Failed to quarantine device {ip_address}") from e

    async def release_device(self, ip_address: str, mac_address: str) -> bool:
        """
        Calls the SDN API to restore the device to its original VLAN.
        """
        if QUARANTINE_MODE == "noop":
            logger.info(f"[NoOp Quarantine] MOCK RELEASE issued for IP {ip_address} / MAC {mac_address}")
            return True

        url = f"{self.base_url}/release"
        payload = {
            "ip_address": ip_address,
            "mac_address": mac_address
        }
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"SUCCESS: Device {ip_address} ({mac_address}) released from quarantine.")
            return True
        except (HTTPStatusError, RequestError) as e:
            logger.error(f"SDN API failed during quarantine release for {ip_address}: {e}")
            raise QuarantineFailedError(f"Failed to release device {ip_address}") from e
            
    async def close(self):
        await self.client.aclose()
