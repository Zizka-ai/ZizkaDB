"""Integration tests for self-hosted stack (search, baseline, memory)."""

from __future__ import annotations

import os
import uuid

import httpx
import pytest

AGENT = "support-bot"
DEV_KEY = os.getenv("DEV_API_KEY", "zizkadb_dev_local")
BASE = os.getenv("ZIZKADB_TEST_URL", "http://localhost:8000")


def _has_openai_key() -> bool:
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key) and key != "sk-..." and len(key) >= 20


@pytest.fixture
def api_headers():
    return {"Authorization": f"Bearer {DEV_KEY}"}


@pytest.mark.asyncio
@pytest.mark.integration
async def test_deep_health():
    async with httpx.AsyncClient(base_url=BASE, timeout=10) as client:
        response = await client.get("/health/deep")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] in {"ok", "degraded"}
    assert "postgres" in body["checks"]
    assert "redis" in body["checks"]
    assert "qdrant" in body["checks"]


@pytest.mark.asyncio
@pytest.mark.integration
@pytest.mark.skipif(not _has_openai_key(), reason="OPENAI_API_KEY not configured")
async def test_search_integration(api_headers):
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        response = await client.post(
            "/v1/search",
            headers=api_headers,
            json={"agent": AGENT, "query": "support question", "limit": 3},
        )
    assert response.status_code == 200
    body = response.json()
    assert "results" in body
    assert isinstance(body["results"], list)


@pytest.mark.asyncio
@pytest.mark.integration
async def test_baseline_integration(api_headers):
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        response = await client.get(
            f"/v1/agents/{AGENT}/baseline",
            headers=api_headers,
            params={"recent_window": 20},
        )
    assert response.status_code == 200
    body = response.json()
    assert "status" in body


@pytest.mark.asyncio
@pytest.mark.integration
async def test_memory_context_and_forget(api_headers):
    forget_value = f"integration-forget-{uuid.uuid4().hex[:8]}"
    async with httpx.AsyncClient(base_url=BASE, timeout=30) as client:
        log_response = await client.post(
            "/v1/events",
            headers=api_headers,
            json={
                "agent": AGENT,
                "event": "integration_test",
                "data": {"user_id": forget_value, "note": "memory integration"},
            },
        )
        assert log_response.status_code == 201

        context_response = await client.post(
            "/v1/memory/context",
            headers=api_headers,
            json={"agent": AGENT, "task": "integration test context"},
        )
        assert context_response.status_code == 200
        assert "context" in context_response.json()

        forget_response = await client.request(
            "DELETE",
            "/v1/memory/forget",
            headers=api_headers,
            json={"filter_key": "user_id", "filter_value": forget_value},
        )
        assert forget_response.status_code == 200
        assert forget_response.json().get("deleted_events", 0) >= 1
