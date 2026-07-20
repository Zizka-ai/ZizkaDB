"""
Unit tests for ZizkaDB Core API rate limiters.
Tests cover OTP request limits and the shared RateLimiter helpers.
"""

import asyncio
import time
from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from main import app
from api.auth import otp_limiter, _otp_storage, _OTP_RATE_MAX, _OTP_RATE_WINDOW_SEC
from api.deps import get_tenant
from api import events as events_module
from services.rate_limiter import (
    InMemoryStorage,
    RedisStorage,
    FixedWindowStrategy,
    RateLimiter
)

try:
    import fakeredis.aioredis as fakeredis_aioredis
except ModuleNotFoundError:  # pragma: no cover - optional for local venvs
    fakeredis_aioredis = None

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# OTP Request Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestOTPRateLimiting:
    def setup_method(self):
        # Unit tests use in-memory storage (no live Redis).
        otp_limiter.storage = InMemoryStorage()
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
        if fakeredis_aioredis is None:
            pytest.skip("fakeredis not installed (see core/requirements-dev.txt)")
        fake_redis = fakeredis_aioredis.FakeRedis(decode_responses=True)
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

    def test_in_memory_check_and_increment_holds_limit_under_concurrency(self):
        """
        Plain get_hits() + record_hit() has a check-then-act race: concurrent
        callers can all read the same under-limit count before any of them
        records, so a burst can overshoot the limit. check_and_increment()
        does both atomically under a single lock acquisition -- exactly
        `limit` of N concurrent callers must be let through, never more.
        """
        storage = InMemoryStorage()
        limit = 10

        async def fire(n: int) -> int:
            results = await asyncio.gather(*(
                storage.check_and_increment("burst-key", limit, 60) for _ in range(n)
            ))
            return sum(1 for allowed, _hits in results if allowed)

        allowed_count = asyncio.run(fire(50))
        assert allowed_count == limit, (
            f"expected exactly {limit} of 50 concurrent callers to be allowed, "
            f"got {allowed_count} -- check_and_increment() is not holding the "
            f"limit atomically"
        )

    def test_redis_check_and_increment_holds_limit_under_concurrency(self):
        """Same guarantee as the in-memory case above, but against a real
        (fake) Redis backend via the WATCH/MULTI/EXEC optimistic-lock loop."""
        if fakeredis_aioredis is None:
            pytest.skip("fakeredis not installed (see core/requirements-dev.txt)")

        with patch("services.rate_limiter.get_redis") as mock_get_redis:
            fake_redis = fakeredis_aioredis.FakeRedis(decode_responses=False)
            mock_get_redis.return_value = fake_redis

            storage = RedisStorage(key_prefix="ratelimit-atomic-test")
            limit = 10

            async def fire(n: int) -> int:
                results = await asyncio.gather(*(
                    storage.check_and_increment("burst-key", limit, 60) for _ in range(n)
                ))
                return sum(1 for allowed, _hits in results if allowed)

            allowed_count = asyncio.run(fire(50))
            assert allowed_count == limit, (
                f"expected exactly {limit} of 50 concurrent callers to be allowed, "
                f"got {allowed_count} -- the WATCH/MULTI/EXEC loop is not holding "
                f"the limit atomically"
            )


class TestOtpStorageSelection:
    def test_explicit_redis(self, monkeypatch):
        monkeypatch.setenv("OTP_RATE_LIMIT_STORAGE", "redis")
        assert isinstance(_otp_storage(), RedisStorage)

    def test_explicit_memory(self, monkeypatch):
        monkeypatch.setenv("OTP_RATE_LIMIT_STORAGE", "memory")
        assert isinstance(_otp_storage(), InMemoryStorage)

    def test_production_defaults_to_redis(self, monkeypatch):
        monkeypatch.delenv("OTP_RATE_LIMIT_STORAGE", raising=False)
        monkeypatch.setenv("ENV", "production")
        assert isinstance(_otp_storage(), RedisStorage)

    def test_development_defaults_to_memory(self, monkeypatch):
        monkeypatch.delenv("OTP_RATE_LIMIT_STORAGE", raising=False)
        monkeypatch.setenv("ENV", "development")
        assert isinstance(_otp_storage(), InMemoryStorage)


class TestOtpRateLimitFailClosed:
    def setup_method(self):
        otp_limiter.storage = InMemoryStorage()
        asyncio.run(otp_limiter.storage.clear())

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_backend_error_returns_503(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        otp_limiter.storage = MagicMock()
        otp_limiter.storage.get_hits = AsyncMock(side_effect=RuntimeError("redis down"))
        otp_limiter.storage.record_hit = AsyncMock()

        response = client.post(
            "/v1/auth/request-otp",
            json={"email": "user@example.com", "intent": "login"},
        )
        assert response.status_code == 503
        assert "temporarily unavailable" in response.json()["detail"]
        mock_request_otp.assert_not_called()


# ──────────────────────────────────────────────────────────────────────────────
# Event Write Rate Limiting Tests (issue #3 -- Rate limit)
# ──────────────────────────────────────────────────────────────────────────────

class TestEventWriteRateLimiting:
    def setup_method(self):
        events_module.write_limiter.storage = InMemoryStorage()
        asyncio.run(events_module.write_limiter.storage.clear())
        app.dependency_overrides[get_tenant] = lambda: {"tenant_id": "rl-tenant"}

    def teardown_method(self):
        app.dependency_overrides.pop(get_tenant, None)

    @patch("api.events.write_event", new_callable=AsyncMock)
    def test_writes_under_limit_succeed(self, mock_write):
        mock_write.return_value = {"event_id": "e1", "sequence_no": 1}
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(events_module._EVENTS_RATE_MAX):
                response = client.post(
                    "/v1/events",
                    json={"agent": "agent1", "event": "test", "data": {}},
                )
                assert response.status_code == 201
            assert mock_write.await_count == events_module._EVENTS_RATE_MAX

    @patch("api.events.write_event", new_callable=AsyncMock)
    def test_burst_exceeds_limit_returns_usable_429(self, mock_write):
        """The 429 must be usable by clients: a structured body plus
        standard rate-limit headers, not just a bare status code."""
        mock_write.return_value = {"event_id": "e1", "sequence_no": 1}
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(events_module._EVENTS_RATE_MAX):
                response = client.post(
                    "/v1/events",
                    json={"agent": "agent1", "event": "test", "data": {}},
                )
                assert response.status_code == 201

            response = client.post(
                "/v1/events",
                json={"agent": "agent1", "event": "test", "data": {}},
            )
            assert response.status_code == 429

            body = response.json()["detail"]
            assert "Too many events" in body["message"]
            assert body["retry_after_seconds"] == events_module._EVENTS_RATE_WINDOW_SEC
            assert body["limit"] == events_module._EVENTS_RATE_MAX
            assert body["window_seconds"] == events_module._EVENTS_RATE_WINDOW_SEC

            assert response.headers["Retry-After"] == str(events_module._EVENTS_RATE_WINDOW_SEC)
            assert response.headers["X-RateLimit-Limit"] == str(events_module._EVENTS_RATE_MAX)
            assert response.headers["X-RateLimit-Remaining"] == "0"
            assert response.headers["X-RateLimit-Reset"] == str(
                int(start_time) + events_module._EVENTS_RATE_WINDOW_SEC
            )
            # The blocked request must not reach the write path.
            assert mock_write.await_count == events_module._EVENTS_RATE_MAX

    @patch("api.events.write_event", new_callable=AsyncMock)
    def test_burst_recovers_after_window_rolls_over(self, mock_write):
        mock_write.return_value = {"event_id": "e1", "sequence_no": 1}
        current_time = [1000000.0]

        with patch("time.time", side_effect=lambda: current_time[0]):
            for _ in range(events_module._EVENTS_RATE_MAX):
                response = client.post(
                    "/v1/events",
                    json={"agent": "agent1", "event": "test", "data": {}},
                )
                assert response.status_code == 201

            blocked = client.post(
                "/v1/events",
                json={"agent": "agent1", "event": "test", "data": {}},
            )
            assert blocked.status_code == 429

            current_time[0] += events_module._EVENTS_RATE_WINDOW_SEC + 1

            response = client.post(
                "/v1/events",
                json={"agent": "agent1", "event": "test", "data": {}},
            )
            assert response.status_code == 201

    @patch("api.events.write_event", new_callable=AsyncMock)
    def test_partitioned_by_tenant_and_agent(self, mock_write):
        mock_write.return_value = {"event_id": "e1", "sequence_no": 1}
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(events_module._EVENTS_RATE_MAX):
                response = client.post(
                    "/v1/events",
                    json={"agent": "agent1", "event": "test", "data": {}},
                )
                assert response.status_code == 201

            # (rl-tenant, agent1) is now at its limit
            blocked = client.post(
                "/v1/events",
                json={"agent": "agent1", "event": "test", "data": {}},
            )
            assert blocked.status_code == 429

            # a sibling agent under the *same* tenant has its own budget --
            # one runaway agent must not starve another agent's writes.
            response = client.post(
                "/v1/events",
                json={"agent": "agent2", "event": "test", "data": {}},
            )
            assert response.status_code == 201

            # a different tenant is unaffected too
            app.dependency_overrides[get_tenant] = lambda: {"tenant_id": "rl-tenant-2"}
            response = client.post(
                "/v1/events",
                json={"agent": "agent1", "event": "test", "data": {}},
            )
            assert response.status_code == 201

    @patch("api.events.write_event", new_callable=AsyncMock)
    def test_limiter_backend_error_fails_open(self, mock_write):
        """Unlike OTP (a brute-force guard), a rate-limit backend outage must
        not block event ingestion — burst protection is best-effort here."""
        mock_write.return_value = {"event_id": "e1", "sequence_no": 1}
        events_module.write_limiter.storage = MagicMock()
        events_module.write_limiter.storage.check_and_increment = AsyncMock(
            side_effect=RuntimeError("redis down")
        )

        response = client.post(
            "/v1/events",
            json={"agent": "agent1", "event": "test", "data": {}},
        )
        assert response.status_code == 201
        mock_write.assert_awaited_once()

