import time
from typing import Dict, Any, Optional
from backend.utils.logger import get_logger
from backend.auth.roles import Role
from backend.database.collections import threats_repo

logger = get_logger(__name__)

class AnalyticsService:
    def __init__(self):
        # In-memory TTL Cache (TTL = 5 mins)
        self._cache = {}
        self._cache_ttl = 300
        
    async def get_trends(self, role: Role, start_time: Optional[float] = None, end_time: Optional[float] = None) -> Dict[str, Any]:
        """
        Aggregates threat trends.
        Uses in-memory cache to prevent expensive DB queries on every dashboard load.
        """
        now = time.time()
        start = start_time if start_time is not None else (now - 86400.0)
        end = end_time if end_time is not None else now
        cache_key = f"trends_{int(start)}_{int(end)}"
        
        # Check cache
        if cache_key in self._cache:
            entry = self._cache[cache_key]
            if now - entry["timestamp"] < self._cache_ttl:
                return entry["data"]
                
        # Cache miss - perform aggregation (Stubbed)
        # In a real impl, this would use MongoDB $match and $group
        logger.debug(f"Cache miss for analytics {cache_key}. Querying database...")
        
        data = {
            "series_name": "Threats Blocked",
            "data": [] # Stub
        }
        
        # Save to cache
        self._cache[cache_key] = {
            "timestamp": now,
            "data": data
        }
        
        # Keep cache small (evict old entries)
        if len(self._cache) > 100:
            self._cache.clear() # Primitive eviction
            
        return data

analytics_service = AnalyticsService()
