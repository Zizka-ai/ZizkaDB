"""
Rate Limiting for ZizkaDB
"""

import time
import logging
import threading
from abc import ABC, abstractmethod
from fastapi import HTTPException
from db.connection import get_redis

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Storage Interfaces and Implementations
# ──────────────────────────────────────────────────────────────────────────────

class RateLimitStorage(ABC):
    @abstractmethod
    async def get_hits(self, key: str, window_sec: int) -> list[float]:
        """Retrieve all active hit timestamps for key within the window."""
        pass

    @abstractmethod
    async def record_hit(self, key: str, timestamp: float, window_sec: int) -> None:
        """Record a hit timestamp for key with an expiration window."""
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Clear all rate limit entries (useful for test resets)."""
        pass


class InMemoryStorage(RateLimitStorage):
    def __init__(
        self,
        enable_cleanup: bool = False,
        cleanup_method: str = "lazy",
        default_ttl_sec: float = 3600.0,
        cleanup_interval_sec: float = 60.0
    ):
        self._data: dict[str, list[float]] = {}
        self._lock = threading.Lock()
        self.enable_cleanup = enable_cleanup
        self.cleanup_method = cleanup_method
        self.default_ttl_sec = default_ttl_sec
        self.cleanup_interval_sec = cleanup_interval_sec
        
        self._gc_thread: threading.Thread | None = None
        self._stop_gc = threading.Event()

        if self.enable_cleanup and self.cleanup_method == "periodic":
            self._start_gc_thread()

    def _start_gc_thread(self):
        self._gc_thread = threading.Thread(target=self._gc_loop, daemon=True, name="InMemoryStorage-GC")
        self._gc_thread.start()
        logger.info("Started periodic background garbage collection thread for InMemoryStorage")

    def _gc_loop(self):
        while not self._stop_gc.wait(self.cleanup_interval_sec):
            self.prune_expired_keys()

    def prune_expired_keys(self):
        now = time.time()
        cutoff = now - self.default_ttl_sec
        pruned_count = 0
        with self._lock:
            for key, hits in list(self._data.items()):
                valid_hits = [t for t in hits if t > cutoff]
                if not valid_hits:
                    self._data.pop(key, None)
                    pruned_count += 1
                else:
                    self._data[key] = valid_hits
        if pruned_count > 0:
            logger.debug(f"InMemoryStorage GC pruned {pruned_count} keys")

    async def get_hits(self, key: str, window_sec: int) -> list[float]:
        now = time.time()
        cutoff = now - window_sec
        with self._lock:
            hits = [t for t in self._data.get(key, []) if t > cutoff]
            if self.enable_cleanup and self.cleanup_method == "lazy" and not hits:
                self._data.pop(key, None)
            else:
                if key in self._data or hits:
                    self._data[key] = hits
            return hits

    async def record_hit(self, key: str, timestamp: float, window_sec: int) -> None:
        with self._lock:
            if key not in self._data:
                self._data[key] = []
            self._data[key].append(timestamp)

    async def clear(self) -> None:
        with self._lock:
            self._data.clear()

    def close(self):
        """Stop periodic GC thread if running."""
        if self._gc_thread:
            self._stop_gc.set()
            self._gc_thread.join(timeout=1.0)


class RedisStorage(RateLimitStorage):
    def __init__(self, key_prefix: str = "ratelimit"):
        self.key_prefix = key_prefix

    def _get_redis_key(self, key: str) -> str:
        return f"{self.key_prefix}:{key}"

    async def get_hits(self, key: str, window_sec: int) -> list[float]:
        redis_client = get_redis()
        rkey = self._get_redis_key(key)
        now = time.time()
        cutoff = now - window_sec
        
        # Remove timestamps older than the window
        await redis_client.zremrangebyscore(rkey, "-inf", cutoff)
        
        # Retrieve remaining hits
        results = await redis_client.zrange(rkey, 0, -1, withscores=True)
        return [score for _, score in results]

    async def record_hit(self, key: str, timestamp: float, window_sec: int) -> None:
        redis_client = get_redis()
        rkey = self._get_redis_key(key)
        
        # Add hit (use stringified timestamp as value to avoid duplication in same microsecond)
        val = f"{timestamp}:{threading.get_ident()}"
        await redis_client.zadd(rkey, {val: timestamp})
        
        # Set expiry to prevent memory leak
        await redis_client.expire(rkey, window_sec)

    async def clear(self) -> None:
        redis_client = get_redis()
        # Find all keys matching key_prefix and delete them
        pattern = f"{self.key_prefix}:*"
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)


# ──────────────────────────────────────────────────────────────────────────────
# Rate Limiting Strategies
# ──────────────────────────────────────────────────────────────────────────────

class RateLimitStrategy(ABC):
    @abstractmethod
    async def check(
        self,
        key: str,
        limit: int,
        window_sec: int,
        storage: RateLimitStorage,
        detail: str
    ) -> None:
        """Check the limit and record a hit if under limit. Raises 429 if exceeded."""
        pass


class SlidingWindowStrategy(RateLimitStrategy):
    async def check(
        self,
        key: str,
        limit: int,
        window_sec: int,
        storage: RateLimitStorage,
        detail: str
    ) -> None:
        hits = await storage.get_hits(key, window_sec)
        if len(hits) >= limit:
            logger.warning(f"Rate limit exceeded (SlidingWindow) for key: {key} (limit={limit}, window={window_sec}s)")
            raise HTTPException(status_code=429, detail=detail)
        
        await storage.record_hit(key, time.time(), window_sec)


class FixedWindowStrategy(RateLimitStrategy):
    async def check(
        self,
        key: str,
        limit: int,
        window_sec: int,
        storage: RateLimitStorage,
        detail: str
    ) -> None:
        now = time.time()
        # Segment time into fixed windows
        window_start = int(now // window_sec)
        fixed_key = f"{key}:fixed:{window_start}"
        
        hits = await storage.get_hits(fixed_key, window_sec)
        if len(hits) >= limit:
            logger.warning(f"Rate limit exceeded (FixedWindow) for key: {key} (limit={limit}, window={window_sec}s)")
            raise HTTPException(status_code=429, detail=detail)
        
        await storage.record_hit(fixed_key, now, window_sec)


# ──────────────────────────────────────────────────────────────────────────────
# Central Controller
# ──────────────────────────────────────────────────────────────────────────────

class RateLimiter:
    def __init__(
        self,
        limit: int,
        window_sec: int,
        storage: RateLimitStorage,
        strategy: RateLimitStrategy,
        detail: str = "Rate limit exceeded. Please try again later."
    ):
        self.limit = limit
        self.window_sec = window_sec
        self.storage = storage
        self.strategy = strategy
        self.detail = detail

    async def check(self, key: str) -> None:
        await self.strategy.check(key, self.limit, self.window_sec, self.storage, self.detail)
