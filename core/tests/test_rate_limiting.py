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
from api.auth import otp_limiter, verify_otp_limiter, _otp_storage, _OTP_RATE_MAX, _OTP_RATE_WINDOW_SEC, _VERIFY_OTP_RATE_MAX
from api.agents import (
    suggestions_rate_limiter,
    suggestions_rate_fallback,
    suggestions_refresh_limiter,
    suggestions_refresh_fallback,
    _suggestions_storage,
    _SUGGESTIONS_RATE_MAX,
    _SUGGESTIONS_RATE_WINDOW_SEC,
    _SUGGESTIONS_REFRESH_MAX,
)
from api.deps import get_tenant
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
# OTP Verify Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestVerifyOTPRateLimiting:
    def setup_method(self):
        verify_otp_limiter.storage = InMemoryStorage()
        asyncio.run(verify_otp_limiter.storage.clear())

    @patch("services.billing.fetch_user_billing", new_callable=AsyncMock)
    @patch("api.auth.verify_otp", new_callable=AsyncMock)
    def test_verify_otp_exceed_limit(self, mock_verify, mock_billing):
        mock_verify.return_value = {
            "access_token": "tok",
            "refresh_token": "ref",
        }
        mock_billing.return_value = None
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(_VERIFY_OTP_RATE_MAX):
                response = client.post(
                    "/v1/auth/verify-otp",
                    json={"email": "user@example.com", "otp": "123456"},
                )
                assert response.status_code == 200

            response = client.post(
                "/v1/auth/verify-otp",
                json={"email": "user@example.com", "otp": "123456"},
            )
            assert response.status_code == 429
            assert "Too many verification attempts" in response.json()["detail"]


# ──────────────────────────────────────────────────────────────────────────────
# Suggestions Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

_TEST_TENANT = {"tenant_id": "suggestions-rate-test-tenant"}


def _override_tenant():
    return _TEST_TENANT


class TestSuggestionsRateLimiting:
    def setup_method(self):
        suggestions_rate_limiter.storage = InMemoryStorage()
        suggestions_refresh_limiter.storage = InMemoryStorage()
        suggestions_rate_fallback.storage = InMemoryStorage()
        suggestions_refresh_fallback.storage = InMemoryStorage()
        asyncio.run(suggestions_rate_limiter.storage.clear())
        asyncio.run(suggestions_refresh_limiter.storage.clear())
        asyncio.run(suggestions_rate_fallback.storage.clear())
        asyncio.run(suggestions_refresh_fallback.storage.clear())
        app.dependency_overrides[get_tenant] = _override_tenant

    def teardown_method(self):
        app.dependency_overrides.pop(get_tenant, None)

    @patch("services.ai.config.ai_configured", return_value=False)
    def test_suggestions_requests_exceed_limit(self, _mock_ai):
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(_SUGGESTIONS_RATE_MAX):
                response = client.get("/v1/agents/test-agent/suggestions")
                assert response.status_code == 200

            response = client.get("/v1/agents/test-agent/suggestions")
            assert response.status_code == 429
            assert "Too many suggestion requests" in response.json()["detail"]

    @patch("services.ai.config.ai_configured", return_value=False)
    def test_suggestions_refresh_exceed_limit(self, _mock_ai):
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(_SUGGESTIONS_REFRESH_MAX):
                response = client.get(
                    "/v1/agents/test-agent/suggestions?refresh=true"
                )
                assert response.status_code == 200

            response = client.get(
                "/v1/agents/test-agent/suggestions?refresh=true"
            )
            assert response.status_code == 429
            assert "Suggestion regeneration limit" in response.json()["detail"]

    @patch("services.ai.config.ai_configured", return_value=False)
    def test_suggestions_fail_open_on_redis_error(self, _mock_ai):
        suggestions_rate_limiter.storage = MagicMock()
        suggestions_rate_limiter.storage.get_hits = AsyncMock(
            side_effect=RuntimeError("redis down")
        )
        suggestions_rate_limiter.storage.record_hit = AsyncMock()

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            response = client.get("/v1/agents/test-agent/suggestions")
            assert response.status_code == 200


class TestSuggestionsStorageSelection:
    def test_explicit_redis(self, monkeypatch):
        monkeypatch.setenv("SUGGESTIONS_RATE_LIMIT_STORAGE", "redis")
        assert isinstance(_suggestions_storage(), RedisStorage)

    def test_explicit_memory(self, monkeypatch):
        monkeypatch.setenv("SUGGESTIONS_RATE_LIMIT_STORAGE", "memory")
        assert isinstance(_suggestions_storage(), InMemoryStorage)

    def test_production_defaults_to_redis(self, monkeypatch):
        monkeypatch.delenv("SUGGESTIONS_RATE_LIMIT_STORAGE", raising=False)
        monkeypatch.setenv("ENV", "production")
        assert isinstance(_suggestions_storage(), RedisStorage)

    def test_development_defaults_to_memory(self, monkeypatch):
        monkeypatch.delenv("SUGGESTIONS_RATE_LIMIT_STORAGE", raising=False)
        monkeypatch.setenv("ENV", "development")
        assert isinstance(_suggestions_storage(), InMemoryStorage)

