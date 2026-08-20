"""Tests for POST /v1/marketing-subscriptions."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.marketing_subscriptions import subscribe_limiter
from main import app
from services.rate_limiter import InMemoryStorage

client = TestClient(app)


class TestMarketingSubscribe:
    def setup_method(self):
        subscribe_limiter.storage = InMemoryStorage()
        asyncio.run(subscribe_limiter.storage.clear())

    @patch("api.marketing_subscriptions.is_suppressed", new_callable=AsyncMock, return_value=False)
    @patch("api.marketing_subscriptions.get_pool")
    def test_subscribe_create(self, mock_get_pool, _mock_suppressed):
        pool = MagicMock()
        pool.execute = AsyncMock()
        mock_get_pool.return_value = pool

        res = client.post(
            "/v1/marketing-subscriptions",
            json={"email": "lead@example.com", "source": "popup", "botcheck": ""},
        )
        assert res.status_code == 201
        assert res.json() == {"ok": True}
        pool.execute.assert_awaited_once()

    def test_subscribe_honeypot(self):
        res = client.post(
            "/v1/marketing-subscriptions",
            json={"email": "lead@example.com", "botcheck": "spam"},
        )
        assert res.status_code == 400
