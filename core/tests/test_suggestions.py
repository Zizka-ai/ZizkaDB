"""Unit tests for the AI Suggestions feature (pure/deterministic logic).

The DB-backed evidence SQL is validated against real data via the API / manual
E2E; here we lock down the parts where correctness lives and hallucination is
prevented: the pure detectors, the tool schema, the validation/grounding layer,
the provider's response handling, and the engine orchestration (Claude mocked).
"""

from __future__ import annotations

from datetime import datetime
from unittest.mock import AsyncMock

import httpx
import pytest

from services.ai import config
from services.ai.claude_provider import (
    ClaudeSuggestionProvider,
    _call_with_retries,
    _extract_tool_input,
)
from services.ai.provider import AIProviderError, SuggestionProvider
from services.suggestions import engine as engine_mod
from services.suggestions import evidence as ev
from services.suggestions.models import Evidence, EvidenceBundle
from services.suggestions.prompt import build_system_prompt, build_tool_schema
from services.suggestions.validation import validate_suggestions


# ── detectors: fire at threshold, not below; honest about opt-in data ───────


def test_low_success_rate_fires_above_threshold():
    s = {"error_rate_pct": 12.0, "error_count": 12, "total_events": 100}
    assert ev._detect_low_success_rate(s) is not None


def test_low_success_rate_silent_below_threshold():
    s = {"error_rate_pct": 2.0, "error_count": 2, "total_events": 100}
    assert ev._detect_low_success_rate(s) is None


def test_recurring_errors_needs_min_count():
    below = [{"error_key": "timeout", "count": 2}]
    at = [{"error_key": "timeout", "count": 3}]
    assert ev._detect_recurring_errors(below) is None
    e = ev._detect_recurring_errors(at)
    assert e is not None and e.id == "recurring_errors"


def test_retry_loops_detects_repeats():
    assert ev._detect_retry_loops([{"event_type": "tool_call", "repeat_count": 2}]) is None
    e = ev._detect_retry_loops([{"event_type": "tool_call", "repeat_count": 5}])
    assert e is not None and e.metrics["repeat_count"] == 5


def test_long_chains_threshold():
    assert ev._detect_long_chains(5, 3.0) is None
    assert ev._detect_long_chains(20, 8.0) is not None


def test_missing_sessions_pct():
    assert ev._detect_missing_sessions(10, 100) is None  # 10% < 40%
    e = ev._detect_missing_sessions(60, 100)
    assert e is not None and e.metrics["missing_pct"] == 60.0


def test_token_usage_opt_in_absent_when_no_data():
    # No events carry token data → signal omitted (never fabricated).
    assert ev._detect_token_usage(0, 100, 0) is None


def test_token_usage_present_with_coverage():
    e = ev._detect_token_usage(40, 100, 50000)
    assert e is not None and e.metrics["coverage_pct"] == 40.0


def test_high_latency_only_above_threshold():
    assert ev._detect_high_latency(10, 100, 1000, 2000) is None  # avg < 5000ms
    assert ev._detect_high_latency(10, 100, 9000, 20000) is not None


def test_strength_scales_and_clamps():
    assert ev._scale(0, 0, 10) == 50
    assert ev._scale(10, 0, 10) == 90
    assert 50 <= ev._scale(5, 0, 10) <= 90


def test_scrub_redacts_secrets_and_caps_length():
    out = ev._scrub("token sk-abcdef123456 tail")
    assert "sk-abcdef123456" not in out and "[redacted]" in out
    assert len(ev._scrub("x" * 500)) <= config.MAX_SAMPLE_CHARS


# ── tool schema: evidence enum == the bundle's real signal ids ──────────────


def _bundle(*signal_ids: str, strengths: dict | None = None) -> EvidenceBundle:
    strengths = strengths or {}
    evd = [
        Evidence(id=sid, category="reliability", label=sid, summary="s", strength=strengths.get(sid, 70))
        for sid in signal_ids
    ]
    return EvidenceBundle(agent="a", period={"from": "x", "to": "y", "days": 1}, summary={}, evidence=evd)


def test_tool_schema_constrains_evidence_to_present_signals():
    b = _bundle("recurring_errors", "retry_loops")
    schema = build_tool_schema(b)
    enum = schema["input_schema"]["properties"]["suggestions"]["items"]["properties"]["evidence"]["items"]["enum"]
    assert enum == ["recurring_errors", "retry_loops"]
    cats = schema["input_schema"]["properties"]["suggestions"]["items"]["properties"]["category"]["enum"]
    assert set(cats) == set(config.CATEGORIES)


def test_system_prompt_states_grounding_rules():
    p = build_system_prompt()
    assert "ONLY the supplied evidence" in p and "Never invent" in p


# ── validation / grounding (the anti-hallucination layer) ───────────────────


def test_validation_drops_fabricated_evidence_ref():
    b = _bundle("recurring_errors")
    raw = [{
        "title": "Ghost", "category": "reliability", "severity": "high", "confidence": 90,
        "evidence": ["does_not_exist"], "recommendation": "x", "expected_impact": "y",
    }]
    assert validate_suggestions(raw, b) == []  # ungrounded → dropped


def test_validation_clamps_confidence_to_signal_strength():
    b = _bundle("recurring_errors", strengths={"recurring_errors": 60})
    raw = [{
        "title": "T", "category": "error_prevention", "severity": "high", "confidence": 95,
        "evidence": ["recurring_errors"], "recommendation": "fix it", "expected_impact": "fewer errors",
    }]
    out = validate_suggestions(raw, b)
    assert len(out) == 1 and out[0].confidence == 60  # clamped to ceiling


def test_validation_strips_code_fix_on_non_implementation_signal():
    b = _bundle("sparse_activity")  # not an implementation signal
    raw = [{
        "title": "T", "category": "general", "severity": "low", "confidence": 50,
        "evidence": ["sparse_activity"], "recommendation": "log more", "expected_impact": "better obs",
        "code_fix": {"language": "python", "code": "print(1)"},
    }]
    out = validate_suggestions(raw, b)
    assert out[0].code_fix is None


def test_validation_keeps_code_fix_on_implementation_signal():
    b = _bundle("recurring_errors")
    raw = [{
        "title": "T", "category": "code", "severity": "high", "confidence": 70,
        "evidence": ["recurring_errors"], "recommendation": "wrap in try", "expected_impact": "fewer errors",
        "code_fix": {"language": "python", "code": "try: ...\nexcept: ..."},
    }]
    out = validate_suggestions(raw, b)
    assert out[0].code_fix and out[0].code_fix["language"] == "python"


def test_validation_drops_unknown_category_and_severity():
    b = _bundle("recurring_errors")
    raw = [
        {"title": "T", "category": "nonsense", "severity": "high", "confidence": 50, "evidence": ["recurring_errors"], "recommendation": "x", "expected_impact": "y"},
        {"title": "T", "category": "code", "severity": "apocalyptic", "confidence": 50, "evidence": ["recurring_errors"], "recommendation": "x", "expected_impact": "y"},
    ]
    assert validate_suggestions(raw, b) == []


def test_validation_dedups_and_caps_and_sorts():
    b = _bundle("recurring_errors", "retry_loops")
    raw = [
        {"title": "dup-low", "category": "code", "severity": "low", "confidence": 40, "evidence": ["recurring_errors"], "recommendation": "x", "expected_impact": "y"},
        {"title": "dup-high", "category": "code", "severity": "low", "confidence": 80, "evidence": ["recurring_errors"], "recommendation": "x", "expected_impact": "y"},
        {"title": "crit", "category": "performance", "severity": "critical", "confidence": 60, "evidence": ["retry_loops"], "recommendation": "x", "expected_impact": "y"},
    ]
    out = validate_suggestions(raw, b)
    # dup on (code, recurring_errors) collapsed to highest confidence; critical sorts first
    assert len(out) == 2
    assert out[0].severity == "critical"
    code_item = next(s for s in out if s.category == "code")
    assert code_item.title == "dup-high"


def test_golden_anti_hallucination_end_to_end():
    """A response mixing a fabricated ref, an over-confident item, and a valid one
    must yield only grounded, correctly-bounded suggestions."""
    b = _bundle("recurring_errors", strengths={"recurring_errors": 55})
    raw = [
        {"title": "made up", "category": "reliability", "severity": "critical", "confidence": 99, "evidence": ["ghost_signal"], "recommendation": "x", "expected_impact": "y"},
        {"title": "real but over-confident", "category": "error_prevention", "severity": "high", "confidence": 99, "evidence": ["recurring_errors"], "recommendation": "add validation", "expected_impact": "fewer errors"},
    ]
    out = validate_suggestions(raw, b)
    assert len(out) == 1
    assert out[0].confidence == 55  # clamped
    assert set(out[0].evidence) <= set(b.signal_ids())  # every ref grounded


# ── provider response handling ──────────────────────────────────────────────


def test_extract_tool_input_refusal_raises():
    with pytest.raises(AIProviderError):
        _extract_tool_input({"stop_reason": "refusal", "content": []})


def test_extract_tool_input_missing_tool_raises():
    with pytest.raises(AIProviderError):
        _extract_tool_input({"stop_reason": "end_turn", "content": [{"type": "text", "text": "hi"}]})


def test_extract_tool_input_returns_input():
    resp = {"stop_reason": "tool_use", "content": [{"type": "tool_use", "name": "emit_suggestions", "input": {"suggestions": []}}]}
    assert _extract_tool_input(resp) == {"suggestions": []}


@pytest.mark.asyncio
async def test_call_with_retries_retries_5xx_then_succeeds(monkeypatch):
    calls = {"n": 0}

    async def flaky(payload):
        calls["n"] += 1
        if calls["n"] == 1:
            req = httpx.Request("POST", "https://x")
            raise httpx.HTTPStatusError("500", request=req, response=httpx.Response(500, request=req))
        return {"ok": True}

    monkeypatch.setattr("services.ai.claude_provider._anthropic_messages", flaky)
    monkeypatch.setattr(config, "MAX_RETRIES", 3)
    resp, retries = await _call_with_retries({})
    assert resp == {"ok": True} and retries == 1


@pytest.mark.asyncio
async def test_call_with_retries_gives_up_on_4xx(monkeypatch):
    async def bad(payload):
        req = httpx.Request("POST", "https://x")
        raise httpx.HTTPStatusError("404", request=req, response=httpx.Response(404, request=req))

    monkeypatch.setattr("services.ai.claude_provider._anthropic_messages", bad)
    with pytest.raises(AIProviderError):
        await _call_with_retries({})


@pytest.mark.asyncio
async def test_claude_provider_generate_parses_tool_output(monkeypatch):
    canned = {
        "model": "claude-sonnet-4-6",
        "stop_reason": "tool_use",
        "usage": {"input_tokens": 100, "output_tokens": 50},
        "content": [{"type": "tool_use", "name": "emit_suggestions", "input": {"suggestions": [{"title": "t"}]}}],
    }
    monkeypatch.setattr("services.ai.claude_provider._anthropic_messages", AsyncMock(return_value=canned))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    raw, meta = await ClaudeSuggestionProvider().generate(
        system_prompt="sys", evidence_payload={}, tool_schema={"name": "emit_suggestions", "input_schema": {}},
    )
    assert raw == [{"title": "t"}] and meta["input_tokens"] == 100


# ── engine orchestration (evidence + provider mocked) ───────────────────────


class _FakeProvider(SuggestionProvider):
    def __init__(self, raw):
        self.raw = raw
        self.called = 0

    async def generate(self, *, system_prompt, evidence_payload, tool_schema):
        self.called += 1
        return self.raw, {"input_tokens": 10, "output_tokens": 5, "retries": 0}


@pytest.mark.asyncio
async def test_engine_empty_evidence_skips_provider(monkeypatch):
    empty = EvidenceBundle(agent="a", period={"from": "x", "to": "y", "days": 1}, summary={}, evidence=[])
    monkeypatch.setattr(engine_mod, "extract_evidence", AsyncMock(return_value=empty))
    prov = _FakeProvider([])
    result = await engine_mod.get_suggestions(
        None, None, "t", "a", datetime(2026, 7, 1), datetime(2026, 7, 20), provider=prov
    )
    assert result.status == "no_evidence" and prov.called == 0


@pytest.mark.asyncio
async def test_engine_generates_and_validates(monkeypatch):
    b = _bundle("recurring_errors", strengths={"recurring_errors": 80})
    monkeypatch.setattr(engine_mod, "extract_evidence", AsyncMock(return_value=b))
    raw = [{
        "title": "Add validation", "category": "error_prevention", "severity": "high", "confidence": 99,
        "evidence": ["recurring_errors"], "recommendation": "validate inputs", "expected_impact": "fewer errors",
    }]
    prov = _FakeProvider(raw)
    result = await engine_mod.get_suggestions(
        None, None, "t", "a", datetime(2026, 7, 1), datetime(2026, 7, 20), provider=prov
    )
    assert result.status == "ok" and len(result.suggestions) == 1
    assert result.suggestions[0].confidence == 80  # clamped to strength
    assert result.meta["from_cache"] is False and result.meta["evidence_count"] == 1


# ── config defaults ─────────────────────────────────────────────────────────


def test_config_defaults(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_MODEL", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    assert config.anthropic_model() == "claude-sonnet-4-6"
    assert config.ai_configured() is False
    assert "code" in config.CATEGORIES and "critical" in config.SEVERITIES
