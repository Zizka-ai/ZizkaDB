"""
Unit tests for the debugging/query endpoints (mocked pool, no running stack):
Causal Trace (why), Impact Trace (impact), Time Travel (at), and the agent-scope
hardening on the memory endpoints. Closes the G9 test gap for these handlers.
"""

import datetime
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from main import app
from api.deps import get_tenant

TENANT_ID = "11111111-1111-1111-1111-111111111111"
TENANT = {"tenant_id": TENANT_ID, "user_id": "user-1"}
# A key scoped to "agent-a" (may only touch agent-a's data).
SCOPED_A = {"tenant_id": TENANT_ID, "user_id": "user-1", "agent_id": "agent-a"}

EID_A = "22222222-2222-2222-2222-222222222222"
EID_B = "33333333-3333-3333-3333-333333333333"


def _row(event_id, *, agent="agent-a", event_type="tool_call", parent=None, depth=0, data=None):
    return {
        "event_id": event_id,
        "agent_id": agent,
        "timestamp": datetime.datetime(2026, 1, 1, 12, 0, 0, tzinfo=datetime.timezone.utc),
        "event_type": event_type,
        "data": data if data is not None else {},
        "parent_event_id": parent,
        "session_id": "sess-1",
        "sequence_no": 1,
        "depth": depth,
    }


@pytest.fixture
def client():
    c = TestClient(app)
    yield c
    app.dependency_overrides.clear()


def _auth(tenant):
    app.dependency_overrides[get_tenant] = lambda: tenant


def _mock_pool(monkeypatch, fetch_result, module="api.events"):
    pool = AsyncMock()
    pool.fetch.return_value = fetch_result
    monkeypatch.setattr(f"{module}.get_pool", lambda: pool)
    return pool


# ── Causal Trace (why) ────────────────────────────────────────────────────────

class TestWhy:
    def test_returns_chain(self, client, monkeypatch):
        _auth(TENANT)
        rows = [_row(EID_B, event_type="user_message", parent=None),
                _row(EID_A, event_type="tool_error", parent=EID_B)]
        _mock_pool(monkeypatch, rows)
        r = client.get(f"/v1/events/{EID_A}/why")
        assert r.status_code == 200
        body = r.json()
        assert body["chain_length"] == 2
        assert set(body["chain"][0].keys()) == {
            "event_id", "agent", "timestamp", "event", "data", "parent_id",
            "session_id", "sequence_no",
        }

    def test_bad_uuid_404(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [])
        assert client.get("/v1/events/not-a-uuid/why").status_code == 404

    def test_unknown_event_404(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [])
        assert client.get(f"/v1/events/{EID_A}/why").status_code == 404

    def test_parent_id_match(self, client, monkeypatch):
        _auth(TENANT)
        rows = [_row(EID_B, parent=None), _row(EID_A, parent=EID_B)]
        _mock_pool(monkeypatch, rows)
        r = client.get(f"/v1/events/{EID_A}/why?parent_id={EID_B}")
        assert r.status_code == 200

    def test_parent_id_mismatch_400(self, client, monkeypatch):
        _auth(TENANT)
        rows = [_row(EID_B, parent=None), _row(EID_A, parent=EID_B)]
        _mock_pool(monkeypatch, rows)
        wrong = "44444444-4444-4444-4444-444444444444"
        r = client.get(f"/v1/events/{EID_A}/why?parent_id={wrong}")
        assert r.status_code == 400
        assert "does not match" in r.json()["detail"]

    def test_parent_id_invalid_uuid_400(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [_row(EID_A, parent=None)])
        r = client.get(f"/v1/events/{EID_A}/why?parent_id=not-a-uuid")
        assert r.status_code == 400

    def test_agent_scope_denied_403(self, client, monkeypatch):
        _auth(SCOPED_A)  # key bound to agent-a
        _mock_pool(monkeypatch, [_row(EID_A, agent="agent-b", parent=None)])
        assert client.get(f"/v1/events/{EID_A}/why").status_code == 403

    def test_agent_scope_allowed(self, client, monkeypatch):
        _auth(SCOPED_A)
        _mock_pool(monkeypatch, [_row(EID_A, agent="agent-a", parent=None)])
        assert client.get(f"/v1/events/{EID_A}/why").status_code == 200


# ── Impact Trace (impact) ─────────────────────────────────────────────────────

class TestImpact:
    def test_returns_tree_with_depth(self, client, monkeypatch):
        _auth(TENANT)
        rows = [_row(EID_A, depth=0, parent=None), _row(EID_B, depth=1, parent=EID_A)]
        _mock_pool(monkeypatch, rows)
        r = client.get(f"/v1/events/{EID_A}/impact")
        assert r.status_code == 200
        body = r.json()
        assert body["node_count"] == 2
        assert body["nodes"][0]["depth"] == 0
        assert body["nodes"][1]["depth"] == 1

    def test_single_leaf(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [_row(EID_A, depth=0, parent=None)])
        body = client.get(f"/v1/events/{EID_A}/impact").json()
        assert body["node_count"] == 1

    def test_bad_uuid_404(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [])
        assert client.get("/v1/events/not-a-uuid/impact").status_code == 404

    def test_unknown_event_404(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [])
        assert client.get(f"/v1/events/{EID_A}/impact").status_code == 404

    def test_agent_scope_denied_403(self, client, monkeypatch):
        _auth(SCOPED_A)
        _mock_pool(monkeypatch, [_row(EID_A, agent="agent-b", depth=0, parent=None)])
        assert client.get(f"/v1/events/{EID_A}/impact").status_code == 403


# ── Time Travel (at) ──────────────────────────────────────────────────────────

class TestTimeTravel:
    TS = "2026-01-01T13:00:00Z"

    def test_state_set_reconstruction(self, client, monkeypatch):
        _auth(TENANT)
        rows = [
            _row(EID_A, event_type="STATE_SET", data={"balance": 100}),
            _row(EID_B, event_type="STATE_SET", data={"status": "active"}),
        ]
        _mock_pool(monkeypatch, rows)
        r = client.get(f"/v1/events/at?agent=agent-a&timestamp={self.TS}")
        assert r.status_code == 200
        body = r.json()
        assert body["event_count"] == 2
        assert body["state"]["balance"] == 100
        assert body["state"]["status"] == "active"

    def test_last_event_fallback(self, client, monkeypatch):
        _auth(TENANT)
        _mock_pool(monkeypatch, [_row(EID_A, event_type="tool_call", data={"x": 1})])
        body = client.get(f"/v1/events/at?agent=agent-a&timestamp={self.TS}").json()
        assert "_last_event" in body["state"]

    def test_missing_timestamp_422(self, client):
        _auth(TENANT)
        assert client.get("/v1/events/at?agent=agent-a").status_code == 422

    def test_missing_agent_422(self, client):
        _auth(TENANT)
        assert client.get(f"/v1/events/at?timestamp={self.TS}").status_code == 422

    def test_agent_scope_denied_403(self, client):
        _auth(SCOPED_A)  # bound to agent-a, requesting agent-b
        assert client.get(f"/v1/events/at?agent=agent-b&timestamp={self.TS}").status_code == 403


# ── Memory endpoints — agent-scope hardening (G5) ─────────────────────────────

class TestMemoryAgentScope:
    def test_context_scope_denied_403(self, client):
        # assert_agent_allowed fires before any DB call, so no pool mock needed.
        _auth(SCOPED_A)
        r = client.post("/v1/memory/context", json={"agent": "agent-b", "task": "x"})
        assert r.status_code == 403

    def test_diff_scope_denied_403(self, client, monkeypatch):
        _auth(SCOPED_A)
        # session belongs to agent-b; scoped key for agent-a must be denied.
        _mock_pool(monkeypatch, [_row(EID_A, agent="agent-b")], module="api.memory")
        assert client.get("/v1/memory/diff/sess-b").status_code == 403
