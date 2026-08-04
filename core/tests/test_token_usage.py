"""Unit tests for token usage pricing + aggregation.

`pricing.cost_for` is pure and tested directly. `token_usage.build_token_usage_report`
is tested against a small fake asyncpg-pool (a fake `.fetch()` returning plain
dict-like rows), since it's the aggregation logic — not the SQL itself — that
needs regression coverage here (SQL query shape is exercised manually per the
plan's verification step against a real Postgres instance).
"""

from datetime import datetime, timedelta, timezone

import pytest

from services import pricing, token_usage


# ── pricing.cost_for ────────────────────────────────────────────────────────


def test_cost_for_known_model():
    cost = pricing.cost_for("claude-sonnet-5", input_tokens=1000, output_tokens=1000)
    assert cost == pytest.approx(0.003 + 0.015)


def test_cost_for_unknown_model_is_zero():
    assert pricing.cost_for("some-made-up-model-2099", input_tokens=1000, output_tokens=1000) == 0.0


def test_cost_for_none_model_is_zero():
    assert pricing.cost_for(None, input_tokens=1000, output_tokens=1000) == 0.0


def test_cost_for_cached_tokens_use_cached_rate():
    # All 1000 input tokens are cached -> cached rate applies, not the standard rate.
    cost = pricing.cost_for("claude-sonnet-5", input_tokens=1000, output_tokens=0, cached_tokens=1000)
    assert cost == pytest.approx(0.0003)


def test_cost_for_negative_tokens_clamped_to_zero():
    cost = pricing.cost_for("claude-sonnet-5", input_tokens=-500, output_tokens=-100)
    assert cost == 0.0


def test_is_known_model():
    assert pricing.is_known_model("claude-sonnet-5") is True
    assert pricing.is_known_model("not-a-real-model") is False
    assert pricing.is_known_model(None) is False


# ── token_usage.build_token_usage_report ────────────────────────────────────


class _FakeRow(dict):
    """dict subclass so both `row["x"]` and attribute-style asyncpg access work."""


class _FakePool:
    def __init__(self, rows):
        self._rows = rows

    async def fetch(self, query, *params):
        return self._rows


def _row(
    event_id="e1",
    timestamp=None,
    session_id="s1",
    event_type="llm_call",
    agent_id="agent-a",
    model="claude-sonnet-5",
    input_tokens=100,
    output_tokens=50,
    cached_tokens=0,
    reasoning_tokens=0,
    workflow=None,
    tool_name=None,
    user_id=None,
    is_failed=False,
):
    return _FakeRow(
        event_id=event_id,
        timestamp=timestamp or datetime(2026, 1, 1, 12, 0, 0),
        session_id=session_id,
        event_type=event_type,
        agent_id=agent_id,
        model=model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cached_tokens=cached_tokens,
        reasoning_tokens=reasoning_tokens,
        workflow=workflow,
        tool_name=tool_name,
        user_id=user_id,
        is_failed=is_failed,
    )


@pytest.mark.asyncio
async def test_empty_range_returns_zeroed_payload():
    pool = _FakePool([])
    from_dt = datetime(2026, 1, 1)
    to_dt = datetime(2026, 1, 8)
    payload = await token_usage.build_token_usage_report(pool, "t1", "agent-a", from_dt, to_dt, "day")

    assert payload["totals"]["total_requests"] == 0
    assert payload["totals"]["total_tokens"] == 0
    assert payload["totals"]["total_cost"] == 0.0
    assert payload["totals"]["avg_tokens_per_request"] == 0.0
    assert payload["unpriced_models"] == []
    assert payload["breakdown"]["model"] == []
    # Trend is still gap-filled even with no data (empty state, not an error).
    assert len(payload["trend"]) > 0
    assert all(b["tokens"] == 0 for b in payload["trend"])


@pytest.mark.asyncio
async def test_mixed_models_and_unpriced_model_flagged():
    rows = [
        _row(model="claude-sonnet-5", input_tokens=1000, output_tokens=1000),
        _row(model="totally-unknown-model", input_tokens=500, output_tokens=500),
    ]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    assert payload["unpriced_models"] == ["totally-unknown-model"]
    # Tokens are still counted for the unpriced model — only cost is excluded.
    assert payload["totals"]["total_tokens"] == 1000 + 1000 + 500 + 500
    assert payload["totals"]["total_cost"] == pytest.approx(0.003 + 0.015)  # only the priced row


@pytest.mark.asyncio
async def test_failed_vs_success_classification():
    rows = [
        _row(is_failed=False),
        _row(is_failed=False),
        _row(is_failed=True),
    ]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    totals = payload["totals"]
    assert totals["total_requests"] == 3
    assert totals["success_count"] == 2
    assert totals["failed_count"] == 1
    assert totals["success_rate_pct"] == pytest.approx(66.67, rel=1e-2)


@pytest.mark.asyncio
async def test_missing_token_usage_events_excluded_by_query():
    # The SQL filter `data ? 'token_usage'` means older events without the key
    # never reach the fake pool's row set at all — simulate that by returning
    # zero rows and asserting an empty, not a fabricated, result.
    pool = _FakePool([])
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    assert payload["totals"]["total_requests"] == 0


@pytest.mark.asyncio
async def test_large_volume_does_not_double_count():
    rows = [_row(event_id=f"e{i}", input_tokens=10, output_tokens=5) for i in range(500)]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    assert payload["totals"]["total_requests"] == 500
    assert payload["totals"]["total_tokens"] == 500 * 15


@pytest.mark.asyncio
async def test_sum_of_breakdown_equals_total_multi_dimension():
    """Regression guard: summing any single breakdown's tokens must equal the
    top-level total — catches a future join/fan-out bug."""
    rows = [
        _row(event_id="e1", model="claude-sonnet-5", tool_name="search", workflow="wf-a", user_id="u1",
             input_tokens=100, output_tokens=50),
        _row(event_id="e2", model="gpt-4o", tool_name="search", workflow="wf-b", user_id="u2",
             input_tokens=200, output_tokens=100),
        _row(event_id="e3", model="claude-sonnet-5", tool_name=None, workflow=None, user_id=None,
             input_tokens=50, output_tokens=25),
    ]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    total = payload["totals"]["total_tokens"]
    for dim in ("model", "tool", "workflow", "user"):
        breakdown_sum = sum(r["tokens"] for r in payload["breakdown"][dim])
        assert breakdown_sum == total, f"breakdown[{dim}] sum mismatch"

    # Rows missing a dimension are grouped under "Unknown", not dropped.
    tool_keys = {r["key"] for r in payload["breakdown"]["tool"]}
    assert "Unknown" in tool_keys


@pytest.mark.asyncio
async def test_malformed_jsonb_tolerant_via_negative_clamp():
    # Simulates what COALESCE(...::bigint, 0) + our Python clamp guarantee:
    # a negative value (which a malformed/adversarial payload could produce
    # after a bad cast) never produces a negative total.
    rows = [_row(input_tokens=-10, output_tokens=-5, cached_tokens=-1, reasoning_tokens=-2)]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "hour"
    )
    totals = payload["totals"]
    assert totals["total_tokens"] == 0
    assert totals["input_tokens"] == 0
    assert totals["total_cost"] == 0.0


@pytest.mark.asyncio
async def test_invalid_granularity_raises():
    pool = _FakePool([])
    with pytest.raises(ValueError):
        await token_usage.build_token_usage_report(
            pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 2), "month"
        )


@pytest.mark.asyncio
async def test_trend_handles_tz_aware_row_timestamps():
    """Regression test: asyncpg returns TIMESTAMPTZ columns as offset-aware
    datetimes, while from_dt/to_dt (and the gap-filled bucket boundaries
    derived from them) are always naive-UTC per services.reports.parse_utc_naive.
    Sorting/comparing the two without normalizing raised
    `TypeError: can't compare offset-naive and offset-aware datetimes` in
    production against a real Postgres instance — the fake-pool unit tests
    above didn't catch it because `_row()` always used naive datetimes.
    """
    rows = [
        _row(timestamp=datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc), input_tokens=100, output_tokens=50),
        _row(timestamp=datetime(2026, 1, 2, 6, 0, 0, tzinfo=timezone.utc), input_tokens=200, output_tokens=100),
    ]
    pool = _FakePool(rows)
    result = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 3), "day"
    )
    assert result["totals"]["total_requests"] == 2
    assert result["totals"]["input_tokens"] == 300
    assert len(result["trend"]) == 2


def test_gap_fill_buckets_hour_on_long_range_is_bounded_by_route_cap():
    """Regression guard for the route-level cap in `api/agents.py::agent_token_usage`.

    The route only ever passes `granularity="hour"` through to
    `build_token_usage_report` for spans <= 7 days (it falls back to
    `reports.resolve_granularity` otherwise) — this asserts that boundary
    actually keeps the bucket count small, since an uncapped 366-day `hour`
    request would gap-fill ~8760 buckets per request.
    """
    from_dt = datetime(2026, 1, 1)
    to_dt = from_dt + timedelta(days=7)
    buckets = token_usage._gap_fill_buckets(from_dt, to_dt, "hour")
    assert len(buckets) == 7 * 24


@pytest.mark.asyncio
async def test_trend_hour_granularity_gap_fills_and_sums_input_output():
    rows = [
        _row(timestamp=datetime(2026, 1, 1, 0, 30), input_tokens=100, output_tokens=50),
        _row(timestamp=datetime(2026, 1, 1, 0, 45), input_tokens=200, output_tokens=100),
        _row(timestamp=datetime(2026, 1, 1, 2, 15), input_tokens=10, output_tokens=5),
    ]
    pool = _FakePool(rows)
    payload = await token_usage.build_token_usage_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1, 0, 0), datetime(2026, 1, 1, 3, 0), "hour"
    )
    trend = payload["trend"]
    # 3 hourly buckets: 00:xx, 01:xx (empty/gap-filled), 02:xx
    assert len(trend) == 3
    assert trend[0]["input_tokens"] == 300
    assert trend[0]["output_tokens"] == 150
    assert trend[1]["tokens"] == 0  # gap-filled, not missing
    assert trend[2]["input_tokens"] == 10
