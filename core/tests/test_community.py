"""Unit tests for public community board routes."""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID

import pytest
from fastapi.testclient import TestClient

from api.community import community_limiter, community_limiter_fallback
from main import app
from services.rate_limiter import InMemoryStorage

client = TestClient(app)

POST_BODY = {
    "author_name": "Ada",
    "author_email": "ada@example.com",
    "category": "question",
    "title": "How do I log events?",
    "body": "I am trying to connect the Python SDK to my local stack.",
    "image_urls": [],
    "website": "",
}


def _mock_pool(fetch_return=None, fetchrow_return=None):
    pool = MagicMock()
    pool.fetch = AsyncMock(return_value=fetch_return or [])
    pool.fetchrow = AsyncMock(return_value=fetchrow_return)
    pool.execute = AsyncMock()
    return pool


class TestCommunityPosts:
    def setup_method(self):
        community_limiter.storage = InMemoryStorage()
        community_limiter_fallback.storage = InMemoryStorage()
        asyncio.run(community_limiter.storage.clear())
        asyncio.run(community_limiter_fallback.storage.clear())

    @patch("api.community.get_pool")
    def test_list_posts_empty(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool(fetch_return=[])
        res = client.get("/v1/community/posts")
        assert res.status_code == 200
        assert res.json() == []

    @patch("api.community.get_pool")
    def test_create_post_happy_path(self, mock_get_pool):
        post_id = "11111111-1111-1111-1111-111111111111"
        now = datetime(2026, 7, 1, tzinfo=timezone.utc)
        mock_get_pool.return_value = _mock_pool(
            fetchrow_return={
                "post_id": UUID(post_id),
                "created_at": now,
            }
        )
        res = client.post("/v1/community/posts", json=POST_BODY)
        assert res.status_code == 201
        data = res.json()
        assert data["id"] == post_id
        assert data["created_at"] == now.isoformat()

    @patch("api.community.get_pool")
    def test_create_post_honeypot_rejects_bot(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool()
        res = client.post(
            "/v1/community/posts",
            json={**POST_BODY, "website": "http://spam.bot"},
        )
        assert res.status_code == 400
        mock_get_pool.return_value.execute.assert_not_called()

    @patch("api.community.get_pool")
    def test_create_post_rate_limit(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool(
            fetchrow_return={
                "post_id": UUID("11111111-1111-1111-1111-111111111111"),
                "created_at": datetime(2026, 7, 1, tzinfo=timezone.utc),
            }
        )
        for _ in range(10):
            assert client.post("/v1/community/posts", json=POST_BODY).status_code == 201
        res = client.post("/v1/community/posts", json=POST_BODY)
        assert res.status_code == 429

    @patch("api.community.get_pool")
    def test_create_post_fail_open_when_redis_unavailable(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool(
            fetchrow_return={
                "post_id": UUID("11111111-1111-1111-1111-111111111111"),
                "created_at": datetime(2026, 7, 1, tzinfo=timezone.utc),
            }
        )
        community_limiter.storage = MagicMock()
        community_limiter.storage.get_hits = AsyncMock(side_effect=RuntimeError("redis down"))
        community_limiter.storage.record_hit = AsyncMock()
        res = client.post("/v1/community/posts", json=POST_BODY)
        assert res.status_code == 201
