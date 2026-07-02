"""Unit tests for the API-key plan-limit config and enforcement guard.

Infrastructure-free: the config logic is pure, and the advisory-locked guard is
exercised against a fake asyncpg connection so no database is required.
"""

import pytest
from fastapi import HTTPException

from services import api_keys
from services.plan_limits import (
    API_KEY_LIMITS,
    api_key_limit_for_plan,
    limits_enforced,
)


# ─────────────────────────────────────────
# api_key_limit_for_plan (single source of truth)
# ─────────────────────────────────────────

class TestApiKeyLimitForPlan:
    def test_pro_plan_capped_at_three(self):
        assert api_key_limit_for_plan("pro") == 3

    def test_team_plan_capped_at_ten(self):
        assert api_key_limit_for_plan("team") == 10

    def test_config_dict_matches_expected(self):
        assert API_KEY_LIMITS == {"pro": 3, "team": 10}

    def test_plan_is_case_and_whitespace_insensitive(self):
        assert api_key_limit_for_plan("  TEAM  ") == 10
        assert api_key_limit_for_plan("Pro") == 3

    def test_unknown_plan_is_unlimited(self):
        assert api_key_limit_for_plan("enterprise") is None
        assert api_key_limit_for_plan("free") is None
        assert api_key_limit_for_plan("pending_checkout") is None

    def test_none_plan_is_unlimited(self):
        assert api_key_limit_for_plan(None) is None


# ─────────────────────────────────────────
# limits_enforced (kill switch)
# ─────────────────────────────────────────

class TestLimitsEnforced:
    def test_defaults_off(self, monkeypatch):
        monkeypatch.delenv("API_KEY_LIMITS_ENFORCED", raising=False)
        assert limits_enforced() is False

    @pytest.mark.parametrize("value", ["1", "true", "TRUE", "yes", "on", " On "])
    def test_truthy_values_enable(self, monkeypatch, value):
        monkeypatch.setenv("API_KEY_LIMITS_ENFORCED", value)
        assert limits_enforced() is True

    @pytest.mark.parametrize("value", ["0", "false", "no", "off", ""])
    def test_falsy_values_disable(self, monkeypatch, value):
        monkeypatch.setenv("API_KEY_LIMITS_ENFORCED", value)
        assert limits_enforced() is False


# ─────────────────────────────────────────
# assert_and_reserve_api_key_slot (enforcement guard)
# ─────────────────────────────────────────

class FakeConn:
    """Minimal asyncpg-connection stand-in for the guard.

    ``fetchval`` routes by SQL: the COUNT query returns the active-key count,
    everything else (the plan lookup) returns the configured plan.
    """

    def __init__(self, plan: str | None, count: int):
        self._plan = plan
        self._count = count
        self.executed: list[tuple] = []

    async def execute(self, query, *args):
        self.executed.append((query, args))
        return "SELECT 1"

    async def fetchval(self, query, *args):
        if "COUNT(" in query:
            return self._count
        return self._plan


class ExplodingConn(FakeConn):
    async def fetchval(self, query, *args):
        if "COUNT(" in query:
            return self._count
        raise RuntimeError("simulated plan lookup failure")


@pytest.fixture
def enforce(monkeypatch):
    """Turn API key limit enforcement ON for the guard under test."""
    monkeypatch.setattr(api_keys, "limits_enforced", lambda: True)


async def test_guard_no_op_when_enforcement_off(monkeypatch):
    monkeypatch.setattr(api_keys, "limits_enforced", lambda: False)
    conn = FakeConn(plan="pro", count=99)
    # Even wildly over limit, disabled enforcement must never raise or lock.
    await api_keys.assert_and_reserve_api_key_slot(conn, tenant_id="t1")
    assert conn.executed == []


async def test_guard_allows_under_limit(enforce):
    conn = FakeConn(plan="pro", count=2)  # limit 3
    await api_keys.assert_and_reserve_api_key_slot(conn, tenant_id="t1")
    # Advisory lock must be taken before the count check.
    assert any("pg_advisory_xact_lock" in q for q, _ in conn.executed)


async def test_guard_blocks_at_limit(enforce):
    conn = FakeConn(plan="pro", count=3)  # limit 3, already full
    with pytest.raises(HTTPException) as exc:
        await api_keys.assert_and_reserve_api_key_slot(conn, tenant_id="t1")
    assert exc.value.status_code == 409
    assert exc.value.detail["code"] == "api_key_limit_reached"
    assert exc.value.detail["limit"] == 3
    assert exc.value.detail["used"] == 3


async def test_guard_team_limit_is_ten(enforce):
    conn_ok = FakeConn(plan="team", count=9)  # under new limit of 10
    await api_keys.assert_and_reserve_api_key_slot(conn_ok, tenant_id="t1")

    conn_full = FakeConn(plan="team", count=10)
    with pytest.raises(HTTPException) as exc:
        await api_keys.assert_and_reserve_api_key_slot(conn_full, tenant_id="t1")
    assert exc.value.detail["limit"] == 10


async def test_guard_unlimited_plan_never_blocks(enforce):
    conn = FakeConn(plan="enterprise", count=500)
    await api_keys.assert_and_reserve_api_key_slot(conn, tenant_id="t1")


async def test_guard_fails_open_on_plan_lookup_error(enforce):
    conn = ExplodingConn(plan="pro", count=99)
    # Plan lookup blows up → allow the create (UX guard, not a security boundary).
    await api_keys.assert_and_reserve_api_key_slot(conn, tenant_id="t1")
