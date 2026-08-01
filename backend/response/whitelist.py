import time
import asyncio
from typing import Dict, Tuple
from backend.utils.logger import get_logger
from backend.database.collections import settings_repo

logger = get_logger(__name__)

class WhitelistManager:
    """
    Caches trusted IPs/MACs to bypass response actions.
    Uses an internal TTL cache to avoid hitting the database on every packet verdict.
    """
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        # Stores IP/MAC -> expiration timestamp
        self._cache: Dict[str, float] = {}
        self._last_refresh = 0.0
        self._lock = asyncio.Lock()

    async def is_whitelisted(self, ip_address: str, mac_address: str = None) -> bool:
        """
        Checks if an IP or MAC is whitelisted.
        Refreshes cache asynchronously if it's stale.
        """
        now = time.time()
        
        # Trigger background refresh if TTL expired
        if now - self._last_refresh > self.ttl:
            # We don't await this to block the hot path, 
            # we create a background task to update the cache
            asyncio.create_task(self.refresh_cache())
            # For the current check, if it's the very first time, we must wait
            if not self._cache and self._last_refresh == 0.0:
                await self.refresh_cache()
                
        # Check cache
        if ip_address in self._cache and self._cache[ip_address] > now:
            return True
        if mac_address and mac_address in self._cache and self._cache[mac_address] > now:
            return True
            
        return False

    async def refresh_cache(self):
        """Pulls the whitelist from the settings repository."""
        async with self._lock:
            now = time.time()
            if now - self._last_refresh < 5.0:
                # Prevent spamming refreshes
                return
                
            try:
                # Assuming settings_repo stores a document: {"key": "whitelist", "value": ["192.168.1.100", "00:11:22:33:44:55"]}
                docs = await settings_repo.list({"key": "whitelist"}, limit=1)
                new_cache = {}
                expiration = time.time() + self.ttl
                
                if docs and "value" in docs[0]:
                    for item in docs[0]["value"]:
                        new_cache[item] = expiration
                        
                self._cache = new_cache
                self._last_refresh = time.time()
                logger.debug("Whitelist cache refreshed from database.")
            except Exception as e:
                logger.error(f"Failed to refresh whitelist cache: {e}")
