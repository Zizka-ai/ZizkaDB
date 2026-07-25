"""Authorization regression tests for the production-readiness hardening.

Covers: agent-scoped API keys must not reach other agents' data via the
SDK-callable memory/why routes, and key-management routes are dashboard-only.
"""

import datetime
import inspect
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from api import agents as agents_api
from api import memory as memory_api
from api import events as events_api
from api.deps import require_dashboard_session
from api.memory import ContextRequest, ForgetRequest, get_context, session_diff, forget
from api.events import why


FULL_TENANT = {"tenant_id": "t-1"}                       # unscoped key / dashboard
SCOPED_TENANT = {"tenant_id": "t-1", "agent_id": "mine"}  # agent-scoped key


# ── /v1/memory/context ────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_context_rejects_cross_agent_scoped_key(monkeypatch):
    """A scoped key asking for another agent's context is 403 before any DB read."""
    monkeypatch.setattr("api.memory.get_pool", lambda: AsyncMock())
    body = ContextRequest(agent="other", task="anything")
    with pytest.raises(HTTPException) as exc:
        await get_context(body, tenant=SCOPED_TENANT)
    assert exc.value.status_code == 403


# ── /v1/memory/diff ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_diff_rejects_cross_agent_scoped_key(monkeypatch):
    """A scoped key diffing a session owned by another agent is 403."""
    pool = AsyncMock()
    pool.fetch.return_value = [{"agent_id": "other"}]  # session belongs to 'other'
    monkeypatch.setattr("api.memory.get_pool", lambda: pool)
    with pytest.raises(HTTPException) as exc:
        await session_diff("sess-1", tenant=SCOPED_TENANT)
    assert exc.value.status_code == 403


# ── /v1/memory/forget ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_forget_constrains_query_to_scoped_agent(monkeypatch):
    """A scoped key's forget must filter the SELECT by its own agent_id."""
    pool = AsyncMock()
    pool.fetch.return_value = []  # no matches → early return, no delete
    monkeypatch.setattr("api.memory.get_pool", lambda: pool)
    await forget(ForgetRequest(filter_key="user_id", filter_value="u1"), tenant=SCOPED_TENANT)

    sql, *_ = pool.fetch.await_args.args
    assert "agent_id = $4" in sql
    assert pool.fetch.await_args.args[-1] == "mine"  # scoped agent bound as $4


@pytest.mark.asyncio
async def test_forget_full_key_stays_tenant_wide(monkeypatch):
    """An unscoped key passes NULL for the agent filter (tenant-wide forget)."""
    pool = AsyncMock()
    pool.fetch.return_value = []
    monkeypatch.setattr("api.memory.get_pool", lambda: pool)
    await forget(ForgetRequest(filter_key="user_id", filter_value="u1"), tenant=FULL_TENANT)
    assert pool.fetch.await_args.args[-1] is None  # $4 is NULL → no agent constraint


# ── /v1/events/{id}/why ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_why_anchors_on_scoped_agent(monkeypatch):
    """A scoped key's causal walk must bind its agent_id to the recursive anchor."""
    pool = AsyncMock()
    pool.fetch.return_value = []  # anchor filtered out → 404 below
    monkeypatch.setattr("api.events.get_pool", lambda: pool)
    with pytest.raises(HTTPException) as exc:
        await why("00000000-0000-0000-0000-000000000001", depth=10, tenant=SCOPED_TENANT)
    assert exc.value.status_code == 404

    sql, *rest = pool.fetch.await_args.args
    assert "agent_id = $4" in sql
    assert pool.fetch.await_args.args[-1] == "mine"


# ── key management is dashboard-only ──────────────────────────────────────────

def _auth_dependency(func):
    """The Depends(...) callable guarding a route handler's auth parameter."""
    for p in inspect.signature(func).parameters.values():
        dep = getattr(p.default, "dependency", None)
        if dep is not None:
            return dep
    return None


def test_key_management_routes_require_dashboard_session():
    """list/create/revoke api-keys must all reject API keys (JWT-only)."""
    for func in (
        agents_api.list_agent_api_keys,
        agents_api.create_agent_api_key,
        agents_api.revoke_agent_api_key,
    ):
        assert _auth_dependency(func) is require_dashboard_session, func.__name__


def test_suggestions_route_is_rate_limited():
    """The expensive AI endpoint declares per-tenant throttle stores."""
    assert hasattr(agents_api, "_SUGGESTIONS_REFRESH_RATE")
    assert hasattr(agents_api, "_SUGGESTIONS_RATE")
