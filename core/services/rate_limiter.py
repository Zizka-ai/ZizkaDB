"""
Rate Limiting for ZizkaDB
"""

import time
import logging
import threading
import uuid
from abc import ABC, abstractmethod
from services.exceptions import rate_limit_exceeded
from db.connection import get_redis

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Storage Interfaces and Implementations
# ──────────────────────────────────────────────────────────────────────────────


class RateLimitStorage(ABC):
    """
    Abstract base class representing the storage backend for rate limiting hits.
    """

    @abstractmethod
    async def get_hits(self, key: str, window_sec: int) -> list[float]:
        """Retrieve all active hit timestamps for key within the window."""
        pass

    @abstractmethod
    async def record_hit(self, key: str, timestamp: float, window_sec: int) -> None:
        """Record a hit timestamp for key with an expiration window."""
        pass

    @abstractmethod
    async def check_and_increment(
        self, key: str, limit: int, window_sec: int
    ) -> tuple[bool, list[float]]:
        """
        Atomically check whether ``key`` is under ``limit`` within ``window_sec``
        and, if so, record a hit -- as a single indivisible operation.

        Strategies must use this instead of composing ``get_hits`` +
        ``record_hit``: that two-step sequence has a check-then-act race --
        concurrent callers can all read the same under-limit count before any
        of them records a hit, letting a burst overshoot the limit by up to
        the burst size. Returns ``(allowed, hits)`` where ``hits`` are the
        active timestamps within the window after the operation (including
        the new hit when allowed).
        """
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Clear all rate limit entries (useful for test resets)."""
        pass


class InMemoryStorage(RateLimitStorage):
    """
    An in-memory thread-safe storage implementation for tracking rate limit hits.
    Supports lazy or periodic cleanup of expired timestamps to prevent memory leaks.
    """

    def __init__(
        self,
        enable_cleanup: bool = False,
        cleanup_method: str = "lazy",
        default_ttl_sec: float = 3600.0,
        cleanup_interval_sec: float = 60.0,
    ):
        """
        Initialize the in-memory storage.

        Args:
            enable_cleanup: Enable garbage collection of expired keys.
            cleanup_method: 'lazy' to prune on retrieval, or 'periodic' to use a background thread.
            default_ttl_sec: Maximum lifespan of keys in seconds.
            cleanup_interval_sec: Interval in seconds for the periodic GC loop.
        """
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
        """Start the background thread for periodic garbage collection."""
        self._gc_thread = threading.Thread(
            target=self._gc_loop, daemon=True, name="InMemoryStorage-GC"
        )
        self._gc_thread.start()
        logger.info("Started periodic background garbage collection thread for InMemoryStorage")

    def _gc_loop(self):
        """Loop run by the GC thread, executing prune_expired_keys periodically."""
        while not self._stop_gc.wait(self.cleanup_interval_sec):
            self.prune_expired_keys()

    def prune_expired_keys(self):
        """Prune keys from storage whose hit lists contain no active timestamps."""
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
        """
        Retrieve all active hit timestamps for a key within the specified window.
        Optionally performs lazy pruning if cleanup is enabled.
        """
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
        """Record a hit timestamp for the given key in memory."""
        with self._lock:
            if key not in self._data:
                self._data[key] = []
            self._data[key].append(timestamp)

    async def check_and_increment(
        self, key: str, limit: int, window_sec: int
    ) -> tuple[bool, list[float]]:
        """
        Atomic within this process: the read-compare-append sequence runs
        entirely inside the lock with no ``await`` in between, so no other
        coroutine can interleave. (Across multiple worker processes this
        storage doesn't coordinate at all -- use ``RedisStorage`` in
        production for that.)
        """
        now = time.time()
        cutoff = now - window_sec
        with self._lock:
            hits = [t for t in self._data.get(key, []) if t > cutoff]
            allowed = len(hits) < limit
            if allowed:
                hits.append(now)
            self._data[key] = hits
            return allowed, hits

    async def clear(self) -> None:
        """Clear all rate limit entries from memory."""
        with self._lock:
            self._data.clear()

    def close(self):
        """Stop periodic GC thread if running."""
        if self._gc_thread:
            self._stop_gc.set()
            self._gc_thread.join(timeout=1.0)


class RedisStorage(RateLimitStorage):
    """
    A Redis-backed storage implementation for tracking rate limit hits.
    Uses sorted sets (ZSET) to store hit timestamps and enforce expiry.
    """

    def __init__(self, key_prefix: str = "ratelimit"):
        """
        Initialize the Redis storage.

        Args:
            key_prefix: Prefix prepended to all Redis keys to isolate rate limiting data.
        """
        self.key_prefix = key_prefix

    def _get_redis_key(self, key: str) -> str:
        """Generate a prefixed Redis key string."""
        return f"{self.key_prefix}:{key}"

    async def get_hits(self, key: str, window_sec: int) -> list[float]:
        """
        Retrieve active hit timestamps from Redis for the key within the window.
        Also automatically prunes expired timestamps from the sorted set.
        """
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
        """
        Record a hit timestamp in Redis using a sorted set (ZSET).
        Appends a UUID to make each entry unique.
        """
        redis_client = get_redis()
        rkey = self._get_redis_key(key)

        # Add hit. A UUID is used (not e.g. threading.get_ident()) because this
        # is async code: every concurrent request on a given worker runs on the
        # same event loop thread, so thread-identity is constant and does not
        # disambiguate concurrent hits. Two concurrent calls with an identical
        # `val` string would collide as the same ZSET member, and ZADD treats a
        # repeated member as an update rather than a new entry -- silently
        # undercounting real hits and weakening the rate limit under concurrent
        # load (verified: 50 concurrent hits collapsed to 1 stored entry before
        # this fix).
        val = f"{timestamp}:{uuid.uuid4().hex}"
        await redis_client.zadd(rkey, {val: timestamp})

        # Set expiry to prevent memory leak
        await redis_client.expire(rkey, window_sec)

    async def check_and_increment(
        self, key: str, limit: int, window_sec: int, _max_retries: int = 5
    ) -> tuple[bool, list[float]]:
        """
        Atomic via optimistic locking (WATCH/MULTI/EXEC): the prune-count-add
        sequence is guarded by a WATCH on the key, so if another client
        touches it between our read and our write, EXEC aborts (returns
        ``None``) and we retry with a fresh read. This closes the
        check-then-act race that plain ``get_hits`` + ``record_hit`` has
        under concurrent load.

        (A Lua ``EVAL`` script would do this in one round trip instead of
        the WATCH retry loop, but the fakeredis backend this is tested
        against doesn't implement scripting -- see core/tests/test_rate_limiting.py.)
        """
        redis_client = get_redis()
        rkey = self._get_redis_key(key)

        for _ in range(_max_retries):
            now = time.time()
            cutoff = now - window_sec
            member = f"{now}:{uuid.uuid4().hex}"

            async with redis_client.pipeline(transaction=True) as pipe:
                await pipe.watch(rkey)
                await pipe.zremrangebyscore(rkey, "-inf", cutoff)
                count = await pipe.zcard(rkey)
                oldest = await pipe.zrange(rkey, 0, 0, withscores=True)
                allowed = count < limit

                pipe.multi()
                if allowed:
                    pipe.zadd(rkey, {member: now})
                    pipe.expire(rkey, window_sec)
                result = await pipe.execute()

            if result is None:
                # Watched key changed concurrently -- another caller raced
                # us between our read and our write. Retry with fresh state.
                continue

            hits = [oldest[0][1]] if oldest else []
            if allowed:
                hits.append(now)
            return allowed, hits

        # Sustained contention on one key across every retry is not a normal
        # rate-limiting workload -- fail closed rather than let a caller
        # bypass the limit after silently exhausting retries.
        raise rate_limit_exceeded(
            detail="Rate limiter temporarily unavailable due to contention. Please retry."
        )

    async def clear(self) -> None:
        """Remove all rate limit keys matching the configured prefix from Redis."""
        redis_client = get_redis()
        # Find all keys matching key_prefix and delete them
        pattern = f"{self.key_prefix}:*"
        keys = await redis_client.keys(pattern)
        if keys:
            await redis_client.delete(*keys)


# ──────────────────────────────────────────────────────────────────────────────
# Rate Limiting Strategies
# ──────────────────────────────────────────────────────────────────────────────


def _rate_limit_headers(limit: int, retry_after_sec: float) -> dict[str, str]:
    """
    Build standard rate-limit headers for a 429 response.

    ``Retry-After`` is what well-behaved HTTP clients (and SDKs) back off on;
    the ``X-RateLimit-*`` triplet lets clients self-throttle before they hit
    the limit at all. Without these, a 429 body's prose is the only signal
    and callers are left guessing how long to wait.
    """
    retry_after = max(1, int(retry_after_sec + 0.999))  # round up, never 0
    return {
        "Retry-After": str(retry_after),
        "X-RateLimit-Limit": str(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": str(int(time.time()) + retry_after),
    }


class RateLimitStrategy(ABC):
    """
    Abstract base class for rate limiting algorithms/strategies.
    """

    @abstractmethod
    async def check(
        self, key: str, limit: int, window_sec: int, storage: RateLimitStorage, detail: str
    ) -> None:
        """Check the limit and record a hit if under limit. Raises 429 if exceeded."""
        pass


class SlidingWindowStrategy(RateLimitStrategy):
    """
    Sliding Window rate limiting strategy.
    Measures requests dynamically over the preceding sliding time window.
    """

    async def check(
        self, key: str, limit: int, window_sec: int, storage: RateLimitStorage, detail: str
    ) -> None:
        """
        Check the limit using a sliding window algorithm.
        Raises HTTPException 429 if the request count exceeds the limit.
        """
        allowed, hits = await storage.check_and_increment(key, limit, window_sec)
        if not allowed:
            logger.warning(
                f"Rate limit exceeded (SlidingWindow) for key: {key} (limit={limit}, window={window_sec}s)"
            )
            retry_after = (min(hits) + window_sec - time.time()) if hits else window_sec
            raise rate_limit_exceeded(
                detail=detail, headers=_rate_limit_headers(limit, retry_after)
            )


class FixedWindowStrategy(RateLimitStrategy):
    """
    Fixed Window rate limiting strategy.
    Divides time into fixed buckets (e.g., calendar hours) and limits requests per bucket.
    """

    async def check(
        self, key: str, limit: int, window_sec: int, storage: RateLimitStorage, detail: str
    ) -> None:
        """
        Check the limit using a fixed window algorithm.
        Raises HTTPException 429 if the request count in the current window exceeds the limit.
        """
        now = time.time()
        # Segment time into fixed windows
        window_start = int(now // window_sec)
        fixed_key = f"{key}:fixed:{window_start}"

        allowed, _hits = await storage.check_and_increment(fixed_key, limit, window_sec)
        if not allowed:
            logger.warning(
                f"Rate limit exceeded (FixedWindow) for key: {key} (limit={limit}, window={window_sec}s)"
            )
            retry_after = (window_start + 1) * window_sec - now
            raise rate_limit_exceeded(
                detail=detail, headers=_rate_limit_headers(limit, retry_after)
            )


# ──────────────────────────────────────────────────────────────────────────────
# Central Controller
# ──────────────────────────────────────────────────────────────────────────────


class RateLimiter:
    """
    Central controller class that coordinates rate limiting checks.
    Combines a specific limit, window duration, storage engine, and algorithm strategy.
    """

    def __init__(
        self,
        limit: int,
        window_sec: int,
        storage: RateLimitStorage,
        strategy: RateLimitStrategy,
        detail: str = "Rate limit exceeded. Please try again later.",
    ):
        """
        Initialize the rate limiter controller.

        Args:
            limit: Maximum allowed requests within the window.
            window_sec: Length of the rate limiting window in seconds.
            storage: Storage backend (e.g., InMemoryStorage, RedisStorage).
            strategy: Limiting strategy (e.g., SlidingWindowStrategy, FixedWindowStrategy).
            detail: Error message detail to raise on failure.
        """
        self.limit = limit
        self.window_sec = window_sec
        self.storage = storage
        self.strategy = strategy
        self.detail = detail

    async def check(self, key: str) -> None:
        """
        Check if the key is within the rate limit.
        Raises HTTPException 429 if the limit is exceeded.
        """
        await self.strategy.check(key, self.limit, self.window_sec, self.storage, self.detail)
