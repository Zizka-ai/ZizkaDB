"""
Unit tests for ZizkaDB Core API rate limiters.
Tests cover OTP request limits and the shared RateLimiter helpers.
"""

import asyncio
import time
import fakeredis.aioredis
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from main import app
from api.auth import otp_limiter, _OTP_RATE_MAX, _OTP_RATE_WINDOW_SEC
from services.rate_limiter import (
    InMemoryStorage,
    RedisStorage,
    FixedWindowStrategy,
    RateLimiter
)

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# OTP Request Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestOTPRateLimiting:
    def setup_method(self):
        # Clear the centralized storage before each test
        asyncio.run(otp_limiter.storage.clear())

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_under_limit(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        # Set up a fixed time
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send max allowed requests
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200
                assert response.json() == {"message": "Code sent"}
            
            assert mock_request_otp.call_count == _OTP_RATE_MAX

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_exceed_limit(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send up to the limit
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200

            # The next request should be blocked
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 429
            assert "Too many code requests" in response.json()["detail"]

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_partitioned_by_email(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send up to the limit for user1
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user1@example.com"})
                assert response.status_code == 200

            # Next request for user1 is rate-limited
            response = client.post("/v1/auth/request-otp", json={"email": "user1@example.com"})
            assert response.status_code == 429

            # But request for user2 should succeed
            response = client.post("/v1/auth/request-otp", json={"email": "user2@example.com"})
            assert response.status_code == 200

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_window_expiry(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        
        # We use a mutable container to simulate advancing time
        current_time = [start_time]
        def get_time():
            return current_time[0]

        with patch("time.time", side_effect=get_time):
            # Fill up the limit
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200

            # Next request is blocked
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 429

            # Advance time past the 15-minute window
            current_time[0] += _OTP_RATE_WINDOW_SEC + 1

            # Request should now succeed again
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 200


# ──────────────────────────────────────────────────────────────────────────────
# Centralized Rate Limiter Features Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestRateLimiterFeatures:
    def test_in_memory_lazy_cleanup(self):
        storage = InMemoryStorage(enable_cleanup=True, cleanup_method="lazy")
        asyncio.run(storage.record_hit("test-key", 1000.0, 60))
        assert "test-key" in storage._data
        
        hits = asyncio.run(storage.get_hits("test-key", window_sec=0))
        assert hits == []
        assert "test-key" not in storage._data

    def test_in_memory_periodic_cleanup(self):
        import time
        storage = InMemoryStorage(
            enable_cleanup=True,
            cleanup_method="periodic",
            default_ttl_sec=0.01,
            cleanup_interval_sec=0.01
        )
        asyncio.run(storage.record_hit("test-key", time.time(), 60))
        assert "test-key" in storage._data
        
        time.sleep(0.08)
        assert "test-key" not in storage._data
        storage.close()

    def test_fixed_window_strategy(self):
        storage = InMemoryStorage()
        limiter = RateLimiter(
            limit=2,
            window_sec=60,
            storage=storage,
            strategy=FixedWindowStrategy()
        )
        
        asyncio.run(limiter.check("user-1"))
        asyncio.run(limiter.check("user-1"))
        
        from fastapi import HTTPException
        import pytest
        with pytest.raises(HTTPException) as exc:
            asyncio.run(limiter.check("user-1"))
        assert exc.value.status_code == 429

    @patch("services.rate_limiter.get_redis")
    def test_redis_storage(self, mock_get_redis):
        mock_redis = MagicMock()
        mock_redis.zremrangebyscore = AsyncMock()
        mock_redis.zrange = AsyncMock(return_value=[(b"1000.0:123", 1000.0)])
        mock_redis.zadd = AsyncMock()
        mock_redis.expire = AsyncMock()
        mock_get_redis.return_value = mock_redis
        
        storage = RedisStorage(key_prefix="ratelimit-test")
        
        asyncio.run(storage.record_hit("user-1", 1000.0, 60))
        mock_redis.zadd.assert_called_once()
        mock_redis.expire.assert_called_once()
        
        hits = asyncio.run(storage.get_hits("user-1", 60))
        assert hits == [1000.0]
        mock_redis.zremrangebyscore.assert_called_once()
        mock_redis.zrange.assert_called_once()

    @patch("services.rate_limiter.get_redis")
    def test_redis_storage_concurrency(self, mock_get_redis):
        """
        Verify that multiple concurrent calls to record_hit() do not generate
        an identical member string, and ZADD silently treated the second
        call as an update to the first rather than a new entry --
        undercounting real request volume and letting far more requests
        through than the configured limit.
        """
        fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
        mock_get_redis.return_value = fake_redis

        storage = RedisStorage(key_prefix="ratelimit-concurrency-test")

        async def fire_concurrent_hits(n: int, timestamp: float) -> int:
            await asyncio.gather(*(
                storage.record_hit("concurrent-key", timestamp, 60) for _ in range(n)
            ))
            hits = await storage.get_hits("concurrent-key", 60)
            return len(hits)

        n_requests = 50
        recorded = asyncio.run(fire_concurrent_hits(n_requests, time.time()))
        assert recorded == n_requests, (
            f"expected all {n_requests} concurrent hits to be recorded distinctly, "
            f"got {recorded} -- record_hit()'s member string is colliding under "
            f"concurrency again"
        )


