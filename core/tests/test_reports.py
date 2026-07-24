"""Unit tests for the report aggregation service (pure/deterministic logic).

The DB-backed composition (`build_report`) is exercised via the API in manual
E2E; here we lock down the pure logic where the correctness rules live: range
validation, granularity resolution, timestamp parsing, distributions, drift
verdict, health derivation and the recommendation rules.
"""

from datetime import datetime

import pytest

from services import reports


# ── parse_utc_naive ────────────────────────────────────────────────────────


def test_parse_utc_naive_z_suffix():
    dt = reports.parse_utc_naive("2026-07-01T00:00:00Z", "from")
    assert dt == datetime(2026, 7, 1, 0, 0, 0)
    assert dt.tzinfo is None


def test_parse_utc_naive_converts_offset_to_utc():
    # +05:00 at 05:00 wall time is 00:00 UTC — must convert, not merely strip.
    dt = reports.parse_utc_naive("2026-07-01T05:00:00+05:00", "from")
    assert dt == datetime(2026, 7, 1, 0, 0, 0)


def test_parse_utc_naive_rejects_garbage():
    with pytest.raises(ValueError):
        reports.parse_utc_naive("not-a-date", "from")


# ── validate_range ─────────────────────────────────────────────────────────


def test_validate_range_ok():
    reports.validate_range(datetime(2026, 1, 1), datetime(2026, 1, 8))  # no raise


@pytest.mark.parametrize("a,b", [
    (datetime(2026, 1, 8), datetime(2026, 1, 1)),   # from > to
    (datetime(2026, 1, 1), datetime(2026, 1, 1)),   # from == to
])
def test_validate_range_bad_order(a, b):
    with pytest.raises(ValueError):
        reports.validate_range(a, b)


def test_validate_range_too_long():
    with pytest.raises(ValueError):
        reports.validate_range(datetime(2024, 1, 1), datetime(2026, 1, 1))


# ── resolve_granularity ────────────────────────────────────────────────────


def test_resolve_granularity_auto_day_for_short_span():
    assert reports.resolve_granularity(datetime(2026, 1, 1), datetime(2026, 2, 1), None) == "day"


def test_resolve_granularity_auto_week_for_long_span():
    assert reports.resolve_granularity(datetime(2025, 1, 1), datetime(2026, 1, 1), None) == "week"


def test_resolve_granularity_day_downgraded_on_long_span():
    # Explicit 'day' must not be honoured on a huge range (bucket explosion).
    assert reports.resolve_granularity(datetime(2025, 1, 1), datetime(2026, 1, 1), "day") == "week"


def test_resolve_granularity_explicit_week_short_span():
    assert reports.resolve_granularity(datetime(2026, 1, 1), datetime(2026, 1, 8), "week") == "week"


# ── distribution_pct / l1_distance / biggest_changes ───────────────────────


def test_distribution_pct():
    rows = [{"key": "a", "count": 3}, {"key": "b", "count": 1}]
    assert reports.distribution_pct(rows, "key") == {"a": 75.0, "b": 25.0}


def test_distribution_pct_empty():
    assert reports.distribution_pct([], "key") == {}


def test_l1_distance_identical_is_zero():
    d = {"a": 50.0, "b": 50.0}
    assert reports.l1_distance(d, d) == 0.0


def test_l1_distance_disjoint_is_one():
    assert reports.l1_distance({"a": 100.0}, {"b": 100.0}) == 1.0


def test_biggest_changes_orders_and_drops_zero():
    base = {"a": 10.0, "b": 20.0, "c": 5.0}
    recent = {"a": 40.0, "b": 20.0, "c": 0.0}
    out = reports.biggest_changes("event_distribution", base, recent)
    assert out[0]["metric"] == "event_distribution.a"   # +30 is biggest
    assert all(d["delta_pp"] != 0 for d in out)          # b (unchanged) dropped


# ── drift_verdict ──────────────────────────────────────────────────────────


@pytest.mark.parametrize("pct,verdict", [
    (0, "stable"), (4.9, "stable"),
    (5, "minor_drift"), (14.9, "minor_drift"),
    (15, "noticeable_drift"), (29.9, "noticeable_drift"),
    (30, "significant_drift"), (100, "significant_drift"),
])
def test_drift_verdict(pct, verdict):
    assert reports.drift_verdict(pct) == verdict


# ── derive_health (truth table) ────────────────────────────────────────────


def _summary(total=100, err=0.0):
    return {"total_events": total, "error_rate_pct": err}


def test_health_idle_when_no_events():
    assert reports.derive_health(_summary(total=0), None) == "idle"


def test_health_error_on_high_error_rate():
    assert reports.derive_health(_summary(err=11), None) == "error"


def test_health_drift_on_significant_verdict():
    assert reports.derive_health(_summary(err=0), {"verdict": "significant_drift"}) == "drift"


def test_health_attention_on_moderate_error_rate():
    assert reports.derive_health(_summary(err=6), None) == "attention"


def test_health_attention_on_minor_drift():
    assert reports.derive_health(_summary(err=0), {"verdict": "minor_drift"}) == "attention"


def test_health_healthy_when_clean():
    assert reports.derive_health(_summary(err=1), {"verdict": "stable"}) == "healthy"


def test_health_error_takes_precedence_over_drift():
    assert reports.derive_health(_summary(err=20), {"verdict": "significant_drift"}) == "error"


# ── build_recommendations (each rule + positive fallback) ──────────────────


def _full_summary(**over):
    base = {
        "total_events": 100, "error_count": 0, "error_rate_pct": 0.0,
        "sessions": 5, "unique_event_types": 4,
    }
    base.update(over)
    return base


def _titles(recs):
    return " | ".join(r["title"] for r in recs)


def test_rec_empty_period():
    recs = reports.build_recommendations(_full_summary(total_events=0), None, {})
    assert len(recs) == 1 and recs[0]["category"] == "observability"


def test_rec_high_error_rate_critical():
    recs = reports.build_recommendations(
        _full_summary(error_rate_pct=15, error_count=15), None, {"error_rate_pct": 15}
    )
    assert any(r["severity"] == "critical" for r in recs)


def test_rec_elevated_error_rate_warning():
    recs = reports.build_recommendations(
        _full_summary(error_rate_pct=6, error_count=6), None, {"error_rate_pct": 6}
    )
    assert any(r["severity"] == "warning" and r["category"] == "reliability" for r in recs)


def test_rec_error_rate_rising():
    recs = reports.build_recommendations(
        _full_summary(error_rate_pct=6, error_count=6), None, {"error_rate_pct": 1}
    )
    assert "rising" in _titles(recs).lower()


def test_rec_drift():
    recs = reports.build_recommendations(
        _full_summary(),
        {"verdict": "significant_drift", "behavior_change_pct": 40},
        {"error_rate_pct": 0},
    )
    assert any(r["category"] == "behavior" for r in recs)


def test_rec_no_sessions():
    recs = reports.build_recommendations(_full_summary(sessions=0), None, {"error_rate_pct": 0})
    assert "session" in _titles(recs).lower()


def test_rec_single_event_type():
    recs = reports.build_recommendations(
        _full_summary(unique_event_types=1), None, {"error_rate_pct": 0}
    )
    assert "one event type" in _titles(recs).lower()


def test_rec_positive_when_all_healthy():
    recs = reports.build_recommendations(_full_summary(), None, {"error_rate_pct": 0})
    assert len(recs) == 1 and recs[0]["severity"] == "positive"
