"""HTTP route tests for GET /v1/agents/{id}/suggestions."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.agents import (
    suggestions_rate_fallback,
    suggestions_rate_limiter,
    suggestions_refresh_fallback,
    suggestions_refresh_limiter,
    _SUGGESTIONS_RATE_MAX,
    _SUGGESTIONS_REFRESH_MAX,
)
from api.deps import get_tenant
from main import app
from services.ai.provider import AIProviderError
from services.rate_limiter import InMemoryStorage
from services.suggestions.models import SuggestionsResult

client = TestClient(app)

_TEST_TENANT = {"tenant_id": "suggestions-route-tenant"}


def _override_tenant():
    return _TEST_TENANT


class TestSuggestionsRoute:
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

    @patch("api.agents.get_redis")
    @patch("api.agents.get_pool")
    @patch("services.ai.config.ai_configured", return_value=True)
    @patch("api.agents.suggestions_engine.get_suggestions", new_callable=AsyncMock)
    def test_returns_suggestions_payload(
        self, mock_get_suggestions, _mock_ai, mock_get_pool, mock_get_redis
    ):
        mock_get_pool.return_value = MagicMock()
        mock_get_redis.return_value = MagicMock()
        mock_get_suggestions.return_value = SuggestionsResult(
            agent="test-agent",
            status="ok",
            period={
                "from": "2026-08-01T00:00:00",
                "to": "2026-09-01T00:00:00",
                "days": 31,
            },
            model="claude-test",
            generated_at="2026-09-01T12:00:00Z",
            suggestions=[],
            evidence=[],
            meta={},
        )

        response = client.get("/v1/agents/test-agent/suggestions")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["agent"] == "test-agent"

    @patch("api.agents.get_redis")
    @patch("api.agents.get_pool")
    @patch("services.ai.config.ai_configured", return_value=True)
    @patch("api.agents.suggestions_engine.get_suggestions", new_callable=AsyncMock)
    def test_ai_provider_error_returns_503(
        self, mock_get_suggestions, _mock_ai, mock_get_pool, mock_get_redis
    ):
        mock_get_pool.return_value = MagicMock()
        mock_get_redis.return_value = MagicMock()
        mock_get_suggestions.side_effect = AIProviderError("upstream timeout")

        response = client.get("/v1/agents/test-agent/suggestions")
        assert response.status_code == 503
        assert "temporarily unavailable" in response.json()["detail"]
        assert "upstream timeout" in response.json()["detail"]

    @patch("services.ai.config.ai_configured", return_value=False)
    def test_ai_not_configured_skips_engine_call(self, _mock_ai):
        response = client.get("/v1/agents/test-agent/suggestions")
        assert response.status_code == 200
        assert response.json()["status"] == "ai_not_configured"

    @patch("services.ai.config.ai_configured", return_value=False)
    def test_refresh_query_is_rate_limited(self, _mock_ai):
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
    def test_general_requests_are_rate_limited(self, _mock_ai):
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(_SUGGESTIONS_RATE_MAX):
                response = client.get("/v1/agents/test-agent/suggestions")
                assert response.status_code == 200

            response = client.get("/v1/agents/test-agent/suggestions")
            assert response.status_code == 429
            assert "Too many suggestion requests" in response.json()["detail"]
