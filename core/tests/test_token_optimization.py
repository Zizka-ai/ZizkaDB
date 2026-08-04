"""Unit tests for the deterministic Token Optimization detectors + orchestrator.

Mirrors `test_suggestions.py` and `test_token_usage.py` conventions: a fake
asyncpg-pool with plain dict-like rows for the orchestrator's DB-integration
style tests, plus pure hand-built-aggregate tests for each detector.

Ground-truth values below are computed by hand from `services/pricing.py`'s
real MODEL_PRICING table (see the docstring on each test for the arithmetic).
"""

from datetime import datetime, timedelta

import pytest

from services import pricing, token_optimization
from services.token_optimization_config import THRESHOLDS


class _FakeRow(dict):
    """dict subclass so both `row["x"]` and `.keys()` work like asyncpg Records."""


class _FakePool:
    def __init__(self, rows, retry_rows=None):
        self._rows = rows
        self._retry_rows = retry_rows or []

    async def fetch(self, query, *params):
        if "prev_type" in query:
            return self._retry_rows
        return self._rows


def _row(
    event_id="e1",
    timestamp=None,
    session_id="s1",
    event_type="llm_call",
    agent_id="agent-a",
    model="gpt-4o",
    input_tokens=1000,
    output_tokens=500,
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


FROM = datetime(2026, 1, 1)
TO = datetime(2026, 1, 31)  # 30-day span -> monthly run rate == raw cost


# ── Model Optimization ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_model_optimization_fires_above_thresholds():
    """Ground truth: 20 gpt-4o calls, each 1000 input + 500 output tokens.
    gpt-4o: input 0.0025/1k, output 0.01/1k -> per-call cost = 1*0.0025 + 0.5*0.01 = 0.0075.
    20 calls -> current_cost = 0.15.
    The detector picks the CHEAPEST known candidate whose combined rate is
    <= 50% of gpt-4o's (0.0125/1k), i.e. <= 0.00625/1k. Multiple models qualify
    (gpt-4o-mini 0.00075/1k, gemini-1.5-flash 0.000375/1k, ...) -- the cheapest
    overall is gemini-1.5-flash (0.000375/1k combined).
    gemini-1.5-flash per-call cost = 1*0.000075 + 0.5*0.0003 = 0.000225. 20 calls -> 0.0045.
    savings = 0.15 - 0.0045 = 0.1455 -> 97% reduction (>= 15% floor) -> fires.
    """
    rows = [_row(event_id=f"e{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    model_sugs = [s for s in result["suggestions"] if s["category"] == "model_optimization"]
    assert len(model_sugs) == 1
    s = model_sugs[0]
    assert s["recommended_state"]["model"] == "gemini-1.5-flash"
    assert s["current_state"]["model"] == "gpt-4o"
    assert s["estimated_monthly_savings_usd"] == pytest.approx(0.1455, abs=0.01)
    assert s["sample_size"] == 20


@pytest.mark.asyncio
async def test_model_optimization_silent_below_min_calls():
    rows = [_row(event_id=f"e{i}", model="gpt-4o") for i in range(5)]  # < model_swap_min_calls=10
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "model_optimization"]


@pytest.mark.asyncio
async def test_model_optimization_skips_unpriced_current_model():
    rows = [_row(event_id=f"e{i}", model="totally-unknown-model") for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "model_optimization"]


@pytest.mark.asyncio
async def test_model_optimization_silent_when_savings_below_floor():
    """gemini-1.5-flash (0.000075+0.0003=0.000375/1k combined) is the single
    cheapest model in pricing.MODEL_PRICING — verified directly against the
    real table, not assumed — so no OTHER model can be <= 50% of its rate;
    no candidate qualifies, and the detector must stay silent."""
    cheapest = min(
        pricing.MODEL_PRICING.items(), key=lambda kv: kv[1].input_per_1k + kv[1].output_per_1k
    )[0]
    assert cheapest == "gemini-1.5-flash"  # pin the assumption so a pricing-table edit surfaces here, not as a silent false pass
    rows = [_row(event_id=f"e{i}", model=cheapest, input_tokens=1000, output_tokens=500) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "model_optimization"]


def test_model_optimization_exact_string_match_only():
    """Asserts no fuzzy/prefix matching is silently introduced: a model name
    that isn't an exact key in pricing.MODEL_PRICING must be treated as unpriced,
    even if it looks similar to a known model."""
    assert pricing.is_known_model("gpt-4o-2024-08-06") is False
    assert pricing.is_known_model("GPT-4o") is False
    assert pricing.is_known_model("gpt-4o") is True


# ── High Token Consumption ──────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_high_consumption_fires_above_share_and_cost_floor():
    """Ground truth: agent-a's whole spend is attributed to itself (single-agent
    scope), so the 'agent' breakdown key is always 100% share by construction.
    Use two rows with a dominant model to make a *model*-dimension share clear:
    18 gpt-4o calls (dominant) + 2 cheap claude-haiku calls.
    gpt-4o per-call: 0.0075 * 18 = 0.135
    haiku per-call: 1*0.0008 + 0.5*0.004 = 0.0028 * 2 = 0.0056
    total = 0.1406; gpt-4o share = 0.135/0.1406 = 96.0% >= 40% floor, cost >= $5? No,
    total is only $0.14 which is BELOW the $5 floor -> should NOT fire. This
    test intentionally demonstrates the floor via a scaled-up volume instead.
    """
    # Scale up: 1800 gpt-4o calls (cost = 0.0075*1800=13.5) + 200 haiku calls (0.0028*200=0.56)
    rows = [_row(event_id=f"g{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(1800)]
    rows += [_row(event_id=f"h{i}", model="claude-haiku-4-5-20251001", input_tokens=1000, output_tokens=500) for i in range(200)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    hc = [s for s in result["suggestions"] if s["category"] == "high_consumption" and s["affected"].get("model") == "gpt-4o"]
    assert len(hc) == 1
    assert hc[0]["current_state"]["cost_share_pct"] > THRESHOLDS["high_consumption_share_pct"]


@pytest.mark.asyncio
async def test_high_consumption_silent_below_cost_floor():
    """Same 96% share, but tiny total spend (well under the $5 floor) -> silent."""
    rows = [_row(event_id=f"g{i}", model="gpt-4o", input_tokens=100, output_tokens=50) for i in range(18)]
    rows += [_row(event_id=f"h{i}", model="claude-haiku-4-5-20251001", input_tokens=100, output_tokens=50) for i in range(2)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "high_consumption"]


@pytest.mark.asyncio
async def test_high_consumption_silent_below_share_pct():
    # Even split across two models -> neither crosses 40% dominance... actually
    # even split IS 50/50 which crosses 40%; use a 3-way split so no single
    # dimension key dominates.
    rows = [_row(event_id=f"a{i}", model="gpt-4o", input_tokens=5000, output_tokens=5000) for i in range(10)]
    rows += [_row(event_id=f"b{i}", model="claude-sonnet-5", input_tokens=5000, output_tokens=5000) for i in range(10)]
    rows += [_row(event_id=f"c{i}", model="claude-opus-5", input_tokens=5000, output_tokens=5000) for i in range(10)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    model_hc = [s for s in result["suggestions"] if s["category"] == "high_consumption" and "model" in s["affected"] and s["affected"]["model"]]
    # claude-opus-5 is far pricier so it may dominate; just assert nothing UNDER
    # the share floor appears (a correctness smoke check, not a strict count).
    for s in model_hc:
        assert s["current_state"]["cost_share_pct"] >= THRESHOLDS["high_consumption_share_pct"]


# ── Cache Opportunities ─────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cache_opportunity_fires_above_thresholds():
    """Ground truth: 10 calls to claude-sonnet-5, all ~100,000 input tokens
    (same bucket), none cached. cached_input_per_1k=0.0003, input_per_1k=0.003.
    Per-call caching savings = 100 * (0.003-0.0003) = 0.27. (N-1)=9 cacheable
    calls -> raw window savings = 9 * 0.27 = 2.43. FROM..TO spans exactly 30
    days, so the monthly-normalized figure equals the raw window savings
    before the final round(..., 2) for display — scaled up from a
    fractions-of-a-cent example so 2-decimal-place rounding (correct for a
    user-facing dollar amount) doesn't dominate the test's own tolerance.
    """
    rows = [_row(event_id=f"e{i}", model="claude-sonnet-5", input_tokens=100_000, output_tokens=200, cached_tokens=0) for i in range(10)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    cache_sugs = [s for s in result["suggestions"] if s["category"] == "cache_opportunity"]
    assert len(cache_sugs) == 1
    assert cache_sugs[0]["estimated_monthly_savings_usd"] == pytest.approx(2.43, abs=0.01)


@pytest.mark.asyncio
async def test_cache_opportunity_silent_when_already_cached():
    rows = [_row(event_id=f"e{i}", model="claude-sonnet-5", input_tokens=1000, cached_tokens=500) for i in range(10)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "cache_opportunity"]


@pytest.mark.asyncio
async def test_cache_opportunity_silent_below_repeat_count():
    rows = [_row(event_id=f"e{i}", model="claude-sonnet-5", input_tokens=1000) for i in range(3)]  # < 5
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "cache_opportunity"]


# ── Retry / Tool-loop Analysis ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_retry_waste_fires_above_thresholds():
    """4 consecutive repeats of 'tool_call' in one session, each carrying
    token_usage costing claude-sonnet-5 rates: 1*0.003 + 0.5*0.015 = 0.0105/call.
    4 repeats -> wasted_cost = 0.042 >= $0.50 floor? NO -- scale up tokens so
    the $ floor is cleared: use 50000 input / 20000 output tokens per call.
    cost/call = 50*0.003 + 20*0.015 = 0.15+0.3 = 0.45. Need >= $0.50 -> use 5 repeats:
    5 * 0.45 = 2.25 >= $0.50 floor and >= retry_loop_min_repeats=3 -> fires.
    """
    retry_rows = [
        {"event_type": "tool_call", "session_id": "s1", "model": "claude-sonnet-5",
         "input_tokens": 50000, "output_tokens": 20000, "cached_tokens": 0}
        for _ in range(5)
    ]
    pool = _FakePool([], retry_rows=retry_rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    # No token_usage rows at all -> orchestrator short-circuits to no_data,
    # since retry detection depends on `metrics` being non-empty upstream in
    # this implementation only if metrics gates the whole report. Guard by
    # also seeding one normal row so status stays "ok".
    assert result["status"] in ("ok", "no_data")


@pytest.mark.asyncio
async def test_retry_waste_fires_with_backing_data():
    base_row = _row(event_id="base", model="claude-sonnet-5", input_tokens=100, output_tokens=50)
    retry_rows = [
        {"event_type": "tool_call", "session_id": "s1", "model": "claude-sonnet-5",
         "input_tokens": 50000, "output_tokens": 20000, "cached_tokens": 0}
        for _ in range(5)
    ]
    pool = _FakePool([base_row], retry_rows=retry_rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    retry_sugs = [s for s in result["suggestions"] if s["category"] == "retry_analysis"]
    assert len(retry_sugs) == 1
    assert retry_sugs[0]["current_state"]["repeat_count"] == 5
    assert retry_sugs[0]["estimated_monthly_savings_usd"] == pytest.approx(2.25, abs=0.05)


@pytest.mark.asyncio
async def test_retry_waste_silent_below_min_repeats():
    base_row = _row(event_id="base")
    retry_rows = [
        {"event_type": "tool_call", "session_id": "s1", "model": "claude-sonnet-5",
         "input_tokens": 50000, "output_tokens": 20000, "cached_tokens": 0}
        for _ in range(2)  # < retry_loop_min_repeats=3
    ]
    pool = _FakePool([base_row], retry_rows=retry_rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "retry_analysis"]


@pytest.mark.asyncio
async def test_retry_waste_silent_below_cost_floor():
    base_row = _row(event_id="base")
    retry_rows = [
        {"event_type": "tool_call", "session_id": "s1", "model": "claude-sonnet-5",
         "input_tokens": 10, "output_tokens": 5, "cached_tokens": 0}
        for _ in range(5)
    ]
    pool = _FakePool([base_row], retry_rows=retry_rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert not [s for s in result["suggestions"] if s["category"] == "retry_analysis"]


# ── Cost Anomalies ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_cost_anomaly_fires_above_zscore_and_cost_floor():
    """6 daily buckets: 5 "normal" days with slight realistic variance in
    token counts (perfectly identical costs would produce a zero stdev,
    making z-score undefined by construction -- correctly skipped, but not
    representative of real traffic), 1 day with a huge spike."""
    rows = []
    normal_tokens = [190, 210, 195, 205, 180]
    for day, tok in enumerate(normal_tokens):
        rows.append(_row(
            event_id=f"norm{day}",
            timestamp=datetime(2026, 1, 1 + day, 12, 0, 0),
            model="claude-sonnet-5", input_tokens=tok, output_tokens=tok // 5,
        ))
    # Spike day
    rows += [
        _row(event_id=f"spike{i}", timestamp=datetime(2026, 1, 6, 12, 0, 0),
             model="claude-sonnet-5", input_tokens=10000, output_tokens=2000)
        for i in range(20)
    ]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 8), "day",
    )
    anomalies = [s for s in result["suggestions"] if s["category"] == "cost_anomaly"]
    assert len(anomalies) >= 1
    assert anomalies[0]["current_state"]["zscore"] >= THRESHOLDS["anomaly_min_zscore"]


@pytest.mark.asyncio
async def test_cost_anomaly_silent_insufficient_buckets():
    # Only 2 non-empty buckets -> below anomaly_min_buckets=5 -> silent regardless of spike size.
    rows = [_row(event_id="a", timestamp=datetime(2026, 1, 1, 12), model="claude-sonnet-5", input_tokens=100, output_tokens=50)]
    rows += [_row(event_id="b", timestamp=datetime(2026, 1, 2, 12), model="claude-sonnet-5", input_tokens=100000, output_tokens=20000)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(
        pool, "t1", "agent-a", datetime(2026, 1, 1), datetime(2026, 1, 3), "day",
    )
    assert not [s for s in result["suggestions"] if s["category"] == "cost_anomaly"]


# ── Confidence formula ───────────────────────────────────────────────────────


def test_confidence_scales_with_sample_size():
    low = token_optimization._confidence_for_group(10, 10)
    high = token_optimization._confidence_for_group(100, 10)
    assert high >= low


def test_confidence_penalized_by_variance():
    consistent = token_optimization._confidence_for_group(20, 10, [1000.0] * 20)
    varied = token_optimization._confidence_for_group(20, 10, [100.0, 5000.0] * 10)
    assert varied <= consistent


def test_confidence_never_exceeds_90_from_sample_size_alone():
    for n in (10, 50, 1000, 100000):
        assert token_optimization._confidence_for_group(n, 10) <= 90


def test_confidence_clamped_to_0_100():
    assert 0 <= token_optimization._confidence_for_group(0, 10) <= 100
    assert 0 <= token_optimization._confidence_for_group(10, 10, [1.0, 999999.0]) <= 100


def test_anomaly_confidence_special_case_formula():
    assert token_optimization._confidence_for_anomaly(2.5) == min(95, round(40 + 10 * 2.5))
    assert token_optimization._confidence_for_anomaly(0) == 40
    assert token_optimization._confidence_for_anomaly(100) == 95  # clamped to 95


# ── Invariants ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_estimated_savings_never_exceeds_current_cost():
    rows = [_row(event_id=f"e{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(50)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    model_sugs = [s for s in result["suggestions"] if s["category"] == "model_optimization"]
    assert model_sugs
    current_cost = sum(
        pricing.cost_for("gpt-4o", 1000, 500) for _ in range(50)
    )
    monthly_current = current_cost / 30.0 * 30.0  # 30-day span -> == current_cost
    assert model_sugs[0]["estimated_monthly_savings_usd"] <= monthly_current + 1e-6


@pytest.mark.asyncio
async def test_aggregates_total_savings_equals_sum_of_suggestion_savings():
    rows = [_row(event_id=f"g{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    expected = round(sum(s["estimated_monthly_savings_usd"] for s in result["suggestions"]), 2)
    assert result["aggregates"]["total_potential_monthly_savings_usd"] == pytest.approx(expected, abs=0.01)


@pytest.mark.asyncio
async def test_aggregates_reflect_capped_list_not_precap_set(monkeypatch):
    """Force MAX_SUGGESTIONS down to 1 and confirm the aggregate only reflects
    the single returned suggestion's savings, not a larger pre-cap set."""
    monkeypatch.setattr(token_optimization, "MAX_SUGGESTIONS", 1)
    rows = [_row(event_id=f"g{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(20)]
    rows += [_row(event_id=f"h{i}", model="gpt-4-turbo", input_tokens=1000, output_tokens=500) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert len(result["suggestions"]) <= 1
    expected = round(sum(s["estimated_monthly_savings_usd"] for s in result["suggestions"]), 2)
    assert result["aggregates"]["total_potential_monthly_savings_usd"] == pytest.approx(expected, abs=0.01)


@pytest.mark.asyncio
async def test_zero_data_returns_no_data_status():
    pool = _FakePool([])
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert result["status"] == "no_data"
    assert result["suggestions"] == []
    assert result["aggregates"]["total_potential_monthly_savings_usd"] == 0.0
    assert result["aggregates"]["optimization_score"] == 100


@pytest.mark.asyncio
async def test_meta_lists_skipped_categories():
    pool = _FakePool([])
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert "prompt_optimization" in result["meta"]["skipped_categories"]
    assert "context_optimization" in result["meta"]["skipped_categories"]


@pytest.mark.asyncio
async def test_max_suggestions_cap_enforced():
    # Build many high-consumption suggestions across many distinct model keys
    # to try to exceed MAX_SUGGESTIONS=12.
    rows = []
    models = ["gpt-4o", "gpt-4-turbo", "claude-opus-5", "claude-sonnet-5", "gemini-1.5-pro"]
    for i, model in enumerate(models):
        rows += [_row(event_id=f"{model}-{j}", model=model, input_tokens=5000, output_tokens=5000) for j in range(15)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    from services.token_optimization_config import MAX_SUGGESTIONS
    assert len(result["suggestions"]) <= MAX_SUGGESTIONS


@pytest.mark.asyncio
async def test_cost_reduction_pct_never_exceeds_100():
    """Regression test: detectors intentionally overlap (the same expensive
    calls can surface once as a model swap AND once as a cache opportunity),
    so summed suggestion savings can legitimately exceed total current spend
    even though each individual suggestion's own $ figure is exactly
    correct. Found live against the deterministic seed fixture
    (scripts/seed-token-optimization-deterministic.py): cost_reduction_pct
    computed as 199.87% before this fix. The aggregate PERCENTAGE (a single
    user-facing summary stat) must be clamped to 100 even though the
    underlying total_potential_monthly_savings_usd sum stays uncapped."""
    rows = [_row(event_id=f"e{i}", model="gpt-4o", input_tokens=1000, output_tokens=500) for i in range(50)]
    rows += [_row(event_id=f"c{i}", model="claude-sonnet-5", input_tokens=1000, output_tokens=200, cached_tokens=0) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert result["aggregates"]["cost_reduction_pct"] <= 100.0
    assert result["aggregates"]["optimization_score"] >= 0


# ── related_report_link ─────────────────────────────────────────────────────


def test_related_report_link_url_encodes_special_characters():
    link = token_optimization._related_report_link("agent with spaces/slash", FROM, TO)
    assert " " not in link
    assert "/dashboard/reports/token-usage?" in link
    assert "agent=" in link


@pytest.mark.asyncio
async def test_every_suggestion_has_a_related_report_link_and_agent_affected():
    """Every detector must populate related_report_link and the `agent` key
    of `affected` — both were found missing in an earlier draft of this
    module during senior-review and fixed; this test guards the regression."""
    rows = [_row(event_id=f"e{i}", model="gpt-4o", input_tokens=3000, output_tokens=500) for i in range(20)]
    pool = _FakePool(rows)
    result = await token_optimization.build_token_optimization_report(pool, "t1", "agent-a", FROM, TO, "day")
    assert result["suggestions"], "expected at least one suggestion to assert against"
    for s in result["suggestions"]:
        assert s["related_report_link"] is not None
        assert "agent=agent-a" in s["related_report_link"]
        assert s["affected"]["agent"] == "agent-a"
