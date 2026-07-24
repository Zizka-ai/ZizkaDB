"""Regression tests: an agent-scoped API key must never read or delete
another agent's events within the same tenant.

Covers four routes that used to skip assert_agent_allowed() entirely --
GET /v1/events/{id}/why, POST /v1/memory/context, GET /v1/memory/diff/{id},
and DELETE /v1/memory/forget -- unlike every comparable per-agent route
(agent_stats, list_sessions, agent_baseline, behavior-change, time_travel),
which already called it.

No live Postgres needed: get_tenant is overridden via FastAPI's
dependency_overrides, and each module's get_pool() is monkeypatched to a
fake pool returning canned rows.
"""

from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from api.deps import get_tenant
from main import app

client = TestClient(app)

SCOPED_TENANT = {"tenant_id": "11111111-1111-1111-1111-111111111111", "agent_id": "bot-a"}
UNSCOPED_TENANT = {"tenant_id": "11111111-1111-1111-1111-111111111111"}
EVENT_ID = "22222222-2222-2222-2222-222222222222"


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.pop(get_tenant, None)


def _as_tenant(tenant: dict) -> None:
    app.dependency_overrides[get_tenant] = lambda: tenant


class TestWhyAgentScope:
    def test_scoped_key_cannot_trace_another_agents_event(self, monkeypatch):
        _as_tenant(SCOPED_TENANT)
        pool = AsyncMock()
        pool.fetchrow.return_value = {"agent_id": "bot-b"}  # event belongs to a different agent
        monkeypatch.setattr("api.events.get_pool", lambda: pool)

        response = client.get(f"/v1/events/{EVENT_ID}/why")

        assert response.status_code == 403
        pool.fetch.assert_not_called()  # never runs the recursive CTE for a disallowed event

    def test_scoped_key_can_trace_its_own_agents_event(self, monkeypatch):
        _as_tenant(SCOPED_TENANT)
        pool = AsyncMock()
        pool.fetchrow.return_value = {"agent_id": "bot-a"}
        pool.fetch.return_value = [{
            "event_id": EVENT_ID,
            "agent_id": "bot-a",
            "timestamp": __import__("datetime").datetime(2026, 1, 1),
            "event_type": "tool_call",
            "data": {},
            "parent_event_id": None,
            "session_id": None,
            "sequence_no": 1,
        }]
        monkeypatch.setattr("api.events.get_pool", lambda: pool)

        response = client.get(f"/v1/events/{EVENT_ID}/why")

        assert response.status_code == 200
        assert response.json()["chain_length"] == 1

    def test_unscoped_key_can_trace_any_agent(self, monkeypatch):
        _as_tenant(UNSCOPED_TENANT)
        pool = AsyncMock()
        pool.fetchrow.return_value = {"agent_id": "bot-b"}
        pool.fetch.return_value = [{
            "event_id": EVENT_ID,
            "agent_id": "bot-b",
            "timestamp": __import__("datetime").datetime(2026, 1, 1),
            "event_type": "tool_call",
            "data": {},
            "parent_event_id": None,
            "session_id": None,
            "sequence_no": 1,
        }]
        monkeypatch.setattr("api.events.get_pool", lambda: pool)

        response = client.get(f"/v1/events/{EVENT_ID}/why")

        assert response.status_code == 200


class TestMemoryContextAgentScope:
    def test_scoped_key_cannot_pull_context_for_another_agent(self, monkeypatch):
        _as_tenant(SCOPED_TENANT)
        pool = AsyncMock()
        monkeypatch.setattr("api.memory.get_pool", lambda: pool)

        response = client.post(
            "/v1/memory/context",
            json={"agent": "bot-b", "task": "anything"},
        )

        assert response.status_code == 403
        pool.fetch.assert_not_called()


class TestMemoryDiffAgentScope:
    def test_scoped_key_cannot_diff_another_agents_session(self, monkeypatch):
        _as_tenant(SCOPED_TENANT)
        pool = AsyncMock()
        pool.fetch.return_value = [{
            "event_id": EVENT_ID,
            "agent_id": "bot-b",
            "event_type": "user_message",
            "data": {},
            "timestamp": __import__("datetime").datetime(2026, 1, 1),
            "parent_event_id": None,
        }]
        monkeypatch.setattr("api.memory.get_pool", lambda: pool)

        response = client.get("/v1/memory/diff/some-session")

        assert response.status_code == 403


class TestForgetAgentScope:
    def test_scoped_key_forget_is_restricted_to_its_own_agent(self, monkeypatch):
        _as_tenant(SCOPED_TENANT)
        pool = AsyncMock()
        pool.fetch.return_value = []  # nothing matches once agent-scoped
        monkeypatch.setattr("api.memory.get_pool", lambda: pool)

        response = client.request(
            "DELETE",
            "/v1/memory/forget",
            json={"filter_key": "user_id", "filter_value": "user_123"},
        )

        assert response.status_code == 200
        assert response.json()["deleted_events"] == 0

        select_sql, *select_params = pool.fetch.call_args.args
        assert "agent_id" in select_sql
        assert "bot-a" in select_params

    def test_unscoped_key_forget_stays_tenant_wide(self, monkeypatch):
        _as_tenant(UNSCOPED_TENANT)
        pool = AsyncMock()
        pool.fetch.return_value = []
        monkeypatch.setattr("api.memory.get_pool", lambda: pool)

        response = client.request(
            "DELETE",
            "/v1/memory/forget",
            json={"filter_key": "user_id", "filter_value": "user_123"},
        )

        assert response.status_code == 200
        select_sql, *select_params = pool.fetch.call_args.args
        assert "agent_id" not in select_sql
        assert "bot-a" not in select_params
