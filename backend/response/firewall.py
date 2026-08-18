import os
from abc import ABC, abstractmethod
import httpx
from httpx import HTTPStatusError, RequestError
from typing import Dict, Any

from backend.utils.logger import get_logger
from backend.response.exceptions import FirewallUnreachableError, FirewallApiError

logger = get_logger(__name__)

# Config
FIREWALL_ADAPTER_TYPE = os.getenv("FIREWALL_ADAPTER_TYPE", "noop").lower()
FIREWALL_API_URL = os.getenv("FIREWALL_API_URL", "https://firewall.local/api/v1")
FIREWALL_API_KEY = os.getenv("FIREWALL_API_KEY", "secret")
FIREWALL_FAIL_MODE = os.getenv("FIREWALL_FAIL_MODE", "fail_open").lower()  # Options: fail_open, fail_closed

class FirewallAdapter(ABC):
    @abstractmethod
    async def block_ip(self, ip_address: str, reason: str) -> bool:
        """Issues a block command to the external firewall."""
        pass
    
    @abstractmethod
    async def unblock_ip(self, ip_address: str) -> bool:
        """Issues an unblock command to the external firewall."""
        pass
    
    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """Checks the health and status of the external firewall."""
        pass

    async def close(self):
        """Cleanup resources."""
        pass

class GenericRESTFirewallAdapter(FirewallAdapter):
    """
    Adapter for a generic REST-based firewall (e.g., pfSense API, Cloudflare WAF).
    Implements retry and timeout logic so the live pipeline isn't blocked.
    """
    def __init__(self):
        self.base_url = FIREWALL_API_URL
        self.headers = {
            "Authorization": f"Bearer {FIREWALL_API_KEY}",
            "Content-Type": "application/json"
        }
        # Short timeout to avoid blocking the pipeline
        self.timeout = httpx.Timeout(2.0, connect=1.0)
        
        # httpx AsyncClient handles connection pooling for us
        self.client = httpx.AsyncClient(headers=self.headers, timeout=self.timeout)

    async def block_ip(self, ip_address: str, reason: str) -> bool:
        url = f"{self.base_url}/block"
        payload = {"ip": ip_address, "reason": reason}
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Firewall block command successful for IP: {ip_address}")
            return True
        except HTTPStatusError as e:
            logger.error(f"Firewall returned an error status: {e.response.status_code}")
            raise FirewallApiError(f"API Error {e.response.status_code}") from e
        except RequestError as e:
            logger.error(f"Failed to connect to Firewall API: {e}")
            raise FirewallUnreachableError("Firewall API is unreachable.") from e

    async def unblock_ip(self, ip_address: str) -> bool:
        url = f"{self.base_url}/unblock"
        payload = {"ip": ip_address}
        
        try:
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            logger.info(f"Firewall unblock command successful for IP: {ip_address}")
            return True
        except HTTPStatusError as e:
            logger.error(f"Firewall returned an error status on unblock: {e.response.status_code}")
            raise FirewallApiError(f"API Error {e.response.status_code}") from e
        except RequestError as e:
            logger.error(f"Failed to connect to Firewall API on unblock: {e}")
            raise FirewallUnreachableError("Firewall API is unreachable.") from e

    async def get_status(self) -> Dict[str, Any]:
        url = f"{self.base_url}/status"
        try:
            response = await self.client.get(url)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.warning(f"Firewall status check failed: {e}")
            return {"status": "unreachable"}
            
    async def close(self):
        await self.client.aclose()


class NoOpFirewallAdapter(FirewallAdapter):
    """
    Mock adapter for local development and testing. 
    Does not make actual network requests.
    """
    async def block_ip(self, ip_address: str, reason: str) -> bool:
        logger.info(f"[NoOp Firewall] MOCK BLOCK issued for IP {ip_address} (Reason: {reason})")
        return True
        
    async def unblock_ip(self, ip_address: str) -> bool:
        logger.info(f"[NoOp Firewall] MOCK UNBLOCK issued for IP {ip_address}")
        return True
        
    async def get_status(self) -> Dict[str, Any]:
        return {"status": "online", "mode": "noop"}

def get_firewall_adapter() -> FirewallAdapter:
    """Factory function to instantiate the correct adapter based on config."""
    if FIREWALL_ADAPTER_TYPE == "generic_rest":
        return GenericRESTFirewallAdapter()
    return NoOpFirewallAdapter()
