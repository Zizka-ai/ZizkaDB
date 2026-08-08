"""Token Optimization Suggestions — deterministic detectors + orchestrator.

100% deterministic, no LLM call. See
docs/adr/007-deterministic-token-optimization.md for why this feature is
built this way while ``services/suggestions/`` is AI-driven.

Reuses ``services/token_usage.py``'s row-fetching and per-row cost
computation (``fetch_rows`` / ``row_metrics``) rather than re-querying, and
its ``_breakdown_from`` / ``_trend`` / ``_bucket_key`` / ``_clamp_nonneg``
grouping/bucketing helpers rather than re-deriving bucket boundaries — reusing
the exact same bucket edges the Token Usage trend chart uses avoids any
DST/timezone misalignment between what the user sees there and what an
anomaly suggestion here cites.

Design note — overlapping detectors are expected, not a bug: a single event
(e.g. an expensive, retried, anomalous-day call) can legitimately contribute
to more than one suggestion simultaneously, because each detector is a
different *lens* on the same underlying cost, not a mutually-exclusive
category. This module intentionally does not attempt cross-detector
deduplication beyond the same-category dedup+cap already applied to the
final list — do not "fix" this into an under-count.
"""

from __future__ import annotations

import statistics
from datetime import datetime
from typing import Any

from services import pricing, token_usage
from services.token_optimization_config import (
    MAX_SUGGESTIONS,
    OPTIMIZATION_SCORE_WEIGHT,
    THRESHOLDS,
)
from services.token_optimization_models import (
    TokenOptimizationAggregates,
    TokenOptimizationResult,
    TokenOptimizationSuggestion,
)

_SEVERITY_RANK = {s: i for i, s in enumerate(("critical", "high", "medium", "low"))}


# ── confidence scoring ──────────────────────────────────────────────────────


def _scale(value: float, low: float, high: float) -> int:
    """Map ``value`` in [low, high] to [40, 90] (clamped).

    Duplicated locally from ``evidence.py``'s ``_scale`` (not imported) —
    deliberately avoids a cross-dependency from this non-AI module into the
    AI-suggestions module; the two are separate paradigms. Range is [40, 90]
    (not [50, 90] like evidence.py) per this feature's own confidence spec:
    data volume alone never claims 100%.
    """
    if high <= low:
        return 65
    ratio = (value - low) / (high - low)
    return max(40, min(90, round(40 + 50 * ratio)))


def _coefficient_of_variation(values: list[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = statistics.fmean(values)
    if mean <= 0:
        return 0.0
    stdev = statistics.pstdev(values)
    return stdev / mean


def _confidence_for_group(
    sample_size: int,
    min_calls: int,
    variance_values: list[float] | None = None,
) -> int:
    """Base confidence scaled by sample size, penalized by variance.

    Base is scaled onto [40, 90] using `min_calls` as the low anchor and
    `min_calls * 10` as a generous high anchor (mirrors evidence.py's shape
    of "barely over threshold -> low end, well over -> high end").
    Consistency penalty (model-optimization / cache-opportunity only):
    coefficient of variation of input_tokens across matched calls; higher
    variance -> lower confidence. This affects confidence only — the
    computed $ savings never change.
    """
    base = _scale(sample_size, min_calls, max(min_calls * 10, min_calls + 1))
    if variance_values:
        cv = _coefficient_of_variation(variance_values)
        penalty = min(30, round(cv * 60))
        base = max(0, base - penalty)
    return max(0, min(100, base))


def _confidence_for_anomaly(zscore: float) -> int:
    """Cost-anomaly special case (sample size of one — the flagged bucket)."""
    return max(0, min(95, round(40 + 10 * zscore)))


# ── grouping helpers (operate on already-clamped token_usage.row_metrics()) ─


def _extend_metrics(rows) -> list[dict]:
    """One combined list of clamped metrics + the extra dimension fields this
    module needs (agent_id, workflow, tool, user) that token_usage.row_metrics()
    itself doesn't carry — the same fields token_usage.py's own breakdown
    already exposes (model/agent/workflow/tool/user), so High Token
    Consumption can cover the same dimension set the Token Usage tab does.
    Every detector below consumes only this — never a raw SQL column
    directly — so malformed-JSONB clamping is never bypassed."""
    out = []
    for r in rows:
        m = token_usage.row_metrics(r)
        m = dict(m)
        m["agent_id"] = r["agent_id"]
        m["workflow"] = r["workflow"] if "workflow" in r.keys() else None
        m["tool_name"] = r["tool_name"] if "tool_name" in r.keys() else None
        m["user_id"] = r["user_id"] if "user_id" in r.keys() else None
        out.append(m)
    return out


def _group_by(metrics: list[dict], key_fn) -> dict[Any, list[dict]]:
    groups: dict[Any, list[dict]] = {}
    for m in metrics:
        key = key_fn(m)
        if key is None:
            continue
        groups.setdefault(key, []).append(m)
    return groups


def _group_cost(group: list[dict]) -> float:
    return sum(m["cost"] for m in group)


def _group_tokens(group: list[dict]) -> int:
    return sum(m["total_tokens"] for m in group)


def _monthly_run_rate(cost: float, from_dt: datetime, to_dt: datetime) -> float:
    """Extrapolate a cost observed over [from_dt, to_dt) to a 30-day run rate."""
    span_days = max((to_dt - from_dt).total_seconds() / 86400.0, 1e-9)
    return cost / span_days * 30.0


def _related_report_link(agent_id: str, from_dt: datetime, to_dt: datetime) -> str:
    """Deep link into the Token Usage tab, pre-filtered to this agent/period."""
    from urllib.parse import urlencode

    qs = urlencode(
        {
            "agent": agent_id,
            "period": "custom",
            "from": from_dt.date().isoformat(),
            "to": to_dt.date().isoformat(),
        }
    )
    return f"/dashboard/reports/token-usage?{qs}"


# ── Detector 1: Model Optimization ──────────────────────────────────────────


def _combined_rate(model: str) -> float | None:
    """Combined $/1k proxy for ranking cheaper candidates: input + output rate."""
    p = pricing.MODEL_PRICING.get(model)
    if p is None:
        return None
    return p.input_per_1k + p.output_per_1k


def _detect_model_optimization(
    metrics: list[dict], from_dt: datetime, to_dt: datetime, thresholds: dict
) -> list[TokenOptimizationSuggestion]:
    out: list[TokenOptimizationSuggestion] = []
    groups = _group_by(metrics, lambda m: (m["agent_id"], m["model"]))
    for (agent_id, model), group in groups.items():
        if model is None or len(group) < thresholds["model_swap_min_calls"]:
            continue
        if not pricing.is_known_model(model):
            continue  # no real baseline to compute savings from
        current_rate = _combined_rate(model)
        if current_rate is None or current_rate <= 0:
            continue

        # Find the cheapest known candidate whose combined rate is within the
        # target ratio of the current model's rate.
        best_candidate = None
        best_rate = None
        for cand_model, cand_pricing in pricing.MODEL_PRICING.items():
            if cand_model == model:
                continue
            cand_rate = cand_pricing.input_per_1k + cand_pricing.output_per_1k
            if cand_rate <= 0 or cand_rate > current_rate * thresholds["model_swap_target_ratio"]:
                continue
            if best_rate is None or cand_rate < best_rate:
                best_rate = cand_rate
                best_candidate = cand_model
        if best_candidate is None:
            continue

        current_cost = _group_cost(group)
        # Recompute historical cost at the candidate's price using the SAME
        # observed token counts — never fabricated.
        candidate_cost = sum(
            pricing.cost_for(best_candidate, m["input_tokens"], m["output_tokens"], m["cached_tokens"])
            for m in group
        )
        if current_cost <= 0:
            continue
        savings = current_cost - candidate_cost
        savings_pct = round(100 * savings / current_cost, 2)
        if savings_pct < thresholds["model_swap_min_savings_pct"]:
            continue

        monthly_current = _monthly_run_rate(current_cost, from_dt, to_dt)
        monthly_candidate = _monthly_run_rate(candidate_cost, from_dt, to_dt)
        monthly_savings = round(monthly_current - monthly_candidate, 6)
        # Invariant: estimated savings can never exceed real historical cost
        # of the thing being optimized.
        monthly_savings = max(0.0, min(monthly_savings, monthly_current))

        total_tokens = _group_tokens(group)
        avg_tokens = round(total_tokens / len(group), 2) if group else 0.0
        input_values = [float(m["input_tokens"]) for m in group]
        confidence = _confidence_for_group(len(group), thresholds["model_swap_min_calls"], input_values)

        severity = "critical" if savings_pct >= 50 else "high" if savings_pct >= 30 else "medium"

        out.append(
            TokenOptimizationSuggestion(
                id=f"model_optimization:{agent_id}:{model}",
                title=f"Switch {model} calls to {best_candidate}",
                category="model_optimization",
                severity=severity,
                estimated_monthly_savings_usd=round(monthly_savings, 2),
                estimated_token_reduction_pct=0.0,  # token count unchanged by a model swap
                confidence_score=confidence,
                summary=(
                    f"{len(group)} calls to {model} cost ${round(current_cost, 4)} over the period "
                    f"({round(monthly_current, 2)}/mo run rate); {best_candidate} would cost "
                    f"${round(candidate_cost, 4)} for the same observed token counts."
                ),
                why=(
                    f"Over {len(group)} calls, {model} billed ${round(current_cost, 4)} for "
                    f"{total_tokens:,} tokens (avg {avg_tokens} tokens/call). At {best_candidate}'s "
                    f"pricing, the same token counts would cost ${round(candidate_cost, 4)} — a "
                    f"{savings_pct}% reduction."
                ),
                recommended_action=f"Switch this agent's calls to {best_candidate} for equivalent workloads.",
                current_state={"model": model, "avg_tokens_per_call": avg_tokens, "calls": len(group)},
                recommended_state={"model": best_candidate},
                affected={"agent": agent_id, "workflow": None, "model": model, "user": None},
                related_report_link=_related_report_link(agent_id, from_dt, to_dt),
                sample_size=len(group),
            )
        )
    return out


# ── Detector 2: High Token Consumption ──────────────────────────────────────


def _detect_high_consumption(
    breakdown: dict[str, list[dict]],
    total_cost: float,
    agent_id: str,
    from_dt: datetime,
    to_dt: datetime,
    thresholds: dict,
) -> list[TokenOptimizationSuggestion]:
    out: list[TokenOptimizationSuggestion] = []
    if total_cost < thresholds["high_consumption_min_cost_usd"]:
        return out
    link = _related_report_link(agent_id, from_dt, to_dt)
    for dim, rows in breakdown.items():
        for r in rows:
            if r["key"] == token_usage.UNKNOWN_BUCKET:
                continue
            share_pct = round(100 * r["cost"] / total_cost, 2) if total_cost else 0.0
            if share_pct < thresholds["high_consumption_share_pct"]:
                continue
            severity = "critical" if share_pct >= 70 else "high" if share_pct >= 55 else "medium"
            out.append(
                TokenOptimizationSuggestion(
                    id=f"high_consumption:{agent_id}:{dim}:{r['key']}",
                    title=f"{r['key']} ({dim}) accounts for {share_pct}% of spend",
                    category="high_consumption",
                    severity=severity,
                    estimated_monthly_savings_usd=0.0,  # observational — no specific action costed yet
                    estimated_token_reduction_pct=0.0,
                    confidence_score=_scale(share_pct, thresholds["high_consumption_share_pct"], 90),
                    summary=(
                        f"{r['key']} represents {share_pct}% of total cost (${round(r['cost'], 4)} "
                        f"of ${round(total_cost, 4)}) across {r['requests']} requests."
                    ),
                    why=(
                        f"{dim}={r['key']} contributed ${round(r['cost'], 4)} of ${round(total_cost, 4)} "
                        f"total spend ({share_pct}%) over {r['requests']} requests and {r['tokens']:,} tokens."
                    ),
                    recommended_action=(
                        f"Review {r['key']}'s usage pattern for this {dim} — it is the dominant cost "
                        "driver in this period and a good first target for the other optimizations below."
                    ),
                    current_state={"cost_share_pct": share_pct, "cost_usd": round(r["cost"], 4), "requests": r["requests"]},
                    recommended_state={},
                    affected={"agent": agent_id, "workflow": None, "model": None, "user": None, dim: r["key"]},
                    related_report_link=link,
                    sample_size=r["requests"],
                )
            )
    return out


# ── Detector 3: Cache Opportunities ─────────────────────────────────────────


def _detect_cache_opportunities(
    metrics: list[dict], from_dt: datetime, to_dt: datetime, thresholds: dict
) -> list[TokenOptimizationSuggestion]:
    out: list[TokenOptimizationSuggestion] = []
    width = thresholds["cache_bucket_width_tokens"]

    def bucket_key(m):
        if m["model"] is None or width <= 0:
            return None
        if m["cached_tokens"] > 0:
            return None  # excludes already-cached calls
        bucket = round(m["input_tokens"] / width)
        return (m["agent_id"], m["model"], bucket)

    groups = _group_by(metrics, bucket_key)
    for (agent_id, model, bucket), group in groups.items():
        n = len(group)
        if n < thresholds["cache_min_repeat_count"]:
            continue
        if not pricing.is_known_model(model):
            continue
        p = pricing.MODEL_PRICING[model]
        if p.cached_input_per_1k <= 0 and p.input_per_1k <= 0:
            continue

        # Estimate as if (N-1)/N of the group had hit the cached-input rate
        # instead of the standard input rate (proxy: same input-token size
        # bucket, NOT verified identical prompts — stated honestly below).
        current_cost = _group_cost(group)
        cacheable_calls = group[1:]  # first call "primes" the cache
        savings = sum(
            (m["input_tokens"] / 1000.0) * (p.input_per_1k - p.cached_input_per_1k)
            for m in cacheable_calls
        )
        savings = max(0.0, min(savings, current_cost))
        if savings <= 0:
            continue
        monthly_savings = _monthly_run_rate(savings, from_dt, to_dt)
        # Invariant: savings can never exceed the (monthly-normalized) current cost.
        monthly_savings = max(0.0, min(monthly_savings, _monthly_run_rate(current_cost, from_dt, to_dt)))

        input_values = [float(m["input_tokens"]) for m in group]
        confidence = _confidence_for_group(n, thresholds["cache_min_repeat_count"], input_values)
        avg_input = round(sum(input_values) / n, 2)
        severity = "high" if n >= thresholds["cache_min_repeat_count"] * 3 else "medium"

        out.append(
            TokenOptimizationSuggestion(
                id=f"cache_opportunity:{agent_id}:{model}:{bucket}",
                title=f"{n} near-identical-size requests to {model} could be cached",
                category="cache_opportunity",
                severity=severity,
                estimated_monthly_savings_usd=round(monthly_savings, 2),
                estimated_token_reduction_pct=round(100 * (n - 1) / n, 2) if n else 0.0,
                confidence_score=confidence,
                summary=(
                    f"{n} calls to {model} share an input size of ~{avg_input} tokens "
                    f"(same-size proxy bucket) — a plausible caching opportunity."
                ),
                why=(
                    f"{n} calls to {model} fall in the same input-token size bucket (~{avg_input} "
                    "tokens each) and none currently report cached_tokens. This is a size-based "
                    "proxy for near-identical requests, not verified identical prompts — no prompt "
                    "text is available to confirm exact duplication."
                ),
                recommended_action=(
                    f"Investigate whether these {n} calls to {model} share a cacheable prompt prefix "
                    "and enable prompt caching if so."
                ),
                current_state={"model": model, "avg_input_tokens": avg_input, "calls": n},
                recommended_state={"cached_tokens": "enabled for repeated prefix"},
                affected={"agent": agent_id, "workflow": None, "model": model, "user": None},
                related_report_link=_related_report_link(agent_id, from_dt, to_dt),
                sample_size=n,
            )
        )
    return out


# ── Detector 4: Retry / Tool-loop Analysis ──────────────────────────────────


def _detect_retry_waste(
    retry_rows, agent_id: str, from_dt: datetime, to_dt: datetime, thresholds: dict
) -> list[TokenOptimizationSuggestion]:
    out: list[TokenOptimizationSuggestion] = []
    groups: dict[str, list] = {}
    for r in retry_rows:
        groups.setdefault(r["event_type"], []).append(r)

    for event_type, rows in groups.items():
        n = len(rows)
        if n < thresholds["retry_loop_min_repeats"]:
            continue
        wasted_cost = sum(
            pricing.cost_for(
                r["model"],
                token_usage._clamp_nonneg(r["input_tokens"]),
                token_usage._clamp_nonneg(r["output_tokens"]),
                token_usage._clamp_nonneg(r["cached_tokens"]),
            )
            for r in rows
        )
        if wasted_cost < thresholds["retry_min_cost_usd"]:
            continue

        monthly_waste = round(_monthly_run_rate(wasted_cost, from_dt, to_dt), 2)
        confidence = _confidence_for_group(n, thresholds["retry_loop_min_repeats"])
        severity = "critical" if n >= thresholds["retry_loop_min_repeats"] * 5 else "high"

        out.append(
            TokenOptimizationSuggestion(
                id=f"retry_analysis:{agent_id}:{event_type}",
                title=f"'{event_type}' repeats back-to-back {n} times",
                category="retry_analysis",
                severity=severity,
                estimated_monthly_savings_usd=monthly_waste,
                estimated_token_reduction_pct=round(100 * (n - 1) / n, 2) if n else 0.0,
                confidence_score=confidence,
                summary=(
                    f"'{event_type}' repeated consecutively within sessions {n} times, costing "
                    f"${round(wasted_cost, 4)} in likely-wasted retries/duplicate tool calls."
                ),
                why=(
                    f"'{event_type}' immediately repeats the same event type within a session {n} "
                    f"times, consistent with a retry or tool-call loop, costing ${round(wasted_cost, 4)} "
                    "across the repeated occurrences (this is a repeat-pattern proxy, not a confirmed "
                    "root cause)."
                ),
                recommended_action=(
                    f"Investigate why '{event_type}' retries/repeats back-to-back and add backoff, "
                    "dedup, or a circuit breaker to avoid the wasted spend."
                ),
                current_state={"event_type": event_type, "repeat_count": n},
                recommended_state={},
                affected={"agent": agent_id, "workflow": None, "model": None, "user": None},
                related_report_link=_related_report_link(agent_id, from_dt, to_dt),
                sample_size=n,
            )
        )
    return out


# ── Detector 5: Cost Anomalies ──────────────────────────────────────────────


def _detect_cost_anomalies(
    trend: list[dict], agent_id: str, from_dt: datetime, to_dt: datetime, thresholds: dict
) -> list[TokenOptimizationSuggestion]:
    out: list[TokenOptimizationSuggestion] = []
    non_empty = [b for b in trend if b["cost"] > 0]
    if len(non_empty) < thresholds["anomaly_min_buckets"]:
        return out

    costs = [b["cost"] for b in non_empty]
    for i, bucket in enumerate(non_empty):
        others = costs[:i] + costs[i + 1 :]
        if len(others) < 2:
            continue
        mean = statistics.fmean(others)
        stdev = statistics.pstdev(others)
        if stdev <= 0:
            continue
        zscore = (bucket["cost"] - mean) / stdev
        if zscore < thresholds["anomaly_min_zscore"]:
            continue
        if bucket["cost"] < thresholds["anomaly_min_cost_usd"]:
            continue

        confidence = _confidence_for_anomaly(zscore)
        severity = "critical" if zscore >= 4 else "high" if zscore >= 3 else "medium"
        excess = round(bucket["cost"] - mean, 4)

        out.append(
            TokenOptimizationSuggestion(
                id=f"cost_anomaly:{agent_id}:{bucket['bucket']}",
                title=f"Cost spike at {bucket['bucket']}",
                category="cost_anomaly",
                severity=severity,
                estimated_monthly_savings_usd=0.0,  # observational; no specific fix costed
                estimated_token_reduction_pct=0.0,
                confidence_score=confidence,
                summary=(
                    f"Bucket {bucket['bucket']} cost ${round(bucket['cost'], 4)} vs a typical "
                    f"${round(mean, 4)} (z-score {round(zscore, 2)})."
                ),
                why=(
                    f"The bucket at {bucket['bucket']} cost ${round(bucket['cost'], 4)}, "
                    f"${excess} above the period's typical ${round(mean, 4)} "
                    f"(z-score {round(zscore, 2)}, threshold {thresholds['anomaly_min_zscore']})."
                ),
                recommended_action=(
                    "Investigate what ran in this window (deploy, retry storm, unusual traffic) "
                    "that drove the spend spike."
                ),
                current_state={
                    "bucket": bucket["bucket"],
                    "cost_usd": round(bucket["cost"], 4),
                    "zscore": round(zscore, 2),
                    "baseline_mean_usd": round(mean, 4),
                },
                recommended_state={"typical_cost_usd": round(mean, 4)},
                affected={"agent": agent_id, "workflow": None, "model": None, "user": None},
                related_report_link=_related_report_link(agent_id, from_dt, to_dt),
                sample_size=1,
            )
        )
    return out


# ── new SQL: retry rows carrying token_usage fields ─────────────────────────


async def _fetch_retry_token_rows(pool, tenant_id: str, agent_id: str, from_dt: datetime, to_dt: datetime):
    return await pool.fetch(
        """
        WITH ordered AS (
            SELECT event_id, session_id, event_type, timestamp,
                   LAG(event_type) OVER (PARTITION BY session_id ORDER BY sequence_no) AS prev_type,
                   COALESCE((data->'token_usage'->>'input_tokens')::bigint, 0) AS input_tokens,
                   COALESCE((data->'token_usage'->>'output_tokens')::bigint, 0) AS output_tokens,
                   COALESCE((data->'token_usage'->>'cached_tokens')::bigint, 0) AS cached_tokens,
                   (data->'token_usage'->>'model') AS model
            FROM events
            WHERE tenant_id = $1 AND agent_id = $2 AND session_id IS NOT NULL
              AND timestamp >= $3 AND timestamp < $4
        )
        SELECT event_type, session_id, model, input_tokens, output_tokens, cached_tokens
        FROM ordered
        WHERE event_type = prev_type
        ORDER BY event_type
        """,
        tenant_id, agent_id, from_dt, to_dt,
    )


# ── dedup + cap (mirrors validation.py's dedup-by-key + sort + cap) ────────


def _dedupe_sort_cap(
    suggestions: list[TokenOptimizationSuggestion], max_suggestions: int
) -> list[TokenOptimizationSuggestion]:
    best: dict[str, TokenOptimizationSuggestion] = {}
    for s in suggestions:
        if s.id not in best or s.estimated_monthly_savings_usd > best[s.id].estimated_monthly_savings_usd:
            best[s.id] = s
    ordered = sorted(
        best.values(),
        key=lambda s: (_SEVERITY_RANK.get(s.severity, 99), -s.estimated_monthly_savings_usd),
    )
    return ordered[:max_suggestions]


# ── orchestrator ─────────────────────────────────────────────────────────


async def build_token_optimization_report(
    pool,
    tenant_id: str,
    agent_id: str,
    from_dt: datetime,
    to_dt: datetime,
    granularity: str,
) -> dict:
    """Assemble the token-optimization payload for ``[from_dt, to_dt)``.

    Fetches rows/metrics once (reusing token_usage.fetch_rows/row_metrics),
    runs the new retry-cost query, builds breakdowns from the already-fetched
    rows, runs all 5 detectors, dedupes+caps, computes aggregates. Returns
    status="no_data" with empty suggestions/zeroed aggregates when there are
    zero token_usage-bearing rows in range (empty state, not an error).

    The retry-cost query and any composite breakdowns are derived from the
    single row-set fetched here — no additional full-table scans beyond what
    token_usage.py already performs for the same range, and beyond the one
    extra retry-loop query.
    """
    rows = await token_usage.fetch_rows(pool, tenant_id, agent_id, from_dt, to_dt)
    metrics = _extend_metrics(rows)
    timestamps = [r["timestamp"] for r in rows]

    total_cost = round(sum(m["cost"] for m in metrics), 6)
    total_tokens = sum(m["total_tokens"] for m in metrics)
    unpriced_models = sorted(
        {m["model"] for m in metrics if m["model"] and not pricing.is_known_model(m["model"])}
    )

    period = {
        "from": token_usage._iso_utc(from_dt),
        "to": token_usage._iso_utc(to_dt),
        "granularity": granularity,
    }

    if not metrics:
        return TokenOptimizationResult(
            agent=agent_id,
            status="no_data",
            period=period,
            aggregates=TokenOptimizationAggregates(
                total_potential_monthly_savings_usd=0.0,
                potential_token_reduction_pct=0.0,
                cost_reduction_pct=0.0,
                optimization_score=100,
                suggestion_count=0,
                critical_count=0,
            ),
            suggestions=[],
            unpriced_models=[],
            meta={
                "skipped_categories": ["prompt_optimization", "context_optimization"],
                "skip_reason": (
                    "Prompt/Context Optimization require prompt/context text, which the "
                    "token_usage JSONB convention does not capture — see ADR-007."
                ),
            },
        ).to_dict()

    breakdown = {
        "model": token_usage._breakdown_from(metrics, lambda m: m["model"]),
        "agent": token_usage._breakdown_from(metrics, lambda m: m["agent_id"]),
        "workflow": token_usage._breakdown_from(metrics, lambda m: m.get("workflow")),
        "tool": token_usage._breakdown_from(metrics, lambda m: m.get("tool_name")),
        "user": token_usage._breakdown_from(metrics, lambda m: m.get("user_id")),
    }

    trend = token_usage._trend(metrics, timestamps, from_dt, to_dt, granularity)
    retry_rows = await _fetch_retry_token_rows(pool, tenant_id, agent_id, from_dt, to_dt)

    suggestions: list[TokenOptimizationSuggestion] = []
    suggestions += _detect_model_optimization(metrics, from_dt, to_dt, THRESHOLDS)
    suggestions += _detect_high_consumption(breakdown, total_cost, agent_id, from_dt, to_dt, THRESHOLDS)
    suggestions += _detect_cache_opportunities(metrics, from_dt, to_dt, THRESHOLDS)
    suggestions += _detect_retry_waste(retry_rows, agent_id, from_dt, to_dt, THRESHOLDS)
    suggestions += _detect_cost_anomalies(trend, agent_id, from_dt, to_dt, THRESHOLDS)

    capped = _dedupe_sort_cap(suggestions, MAX_SUGGESTIONS)

    # Aggregates are computed from the capped, RETURNED list — never the
    # full pre-cap set — so the summary never promises savings the card
    # list doesn't enumerate.
    total_savings = round(sum(s.estimated_monthly_savings_usd for s in capped), 2)
    current_monthly_run_rate = _monthly_run_rate(total_cost, from_dt, to_dt)
    # Detectors intentionally overlap (the same expensive calls can surface
    # once as a model swap AND once as a cache opportunity — different
    # lenses on the same cost, see module docstring). Summed savings can
    # therefore legitimately exceed the agent's total current spend even
    # though each individual suggestion's own dollar figure is exactly
    # correct. `total_potential_monthly_savings_usd` (the sum of real,
    # independently-verifiable line items) is left uncapped — but the
    # *aggregate percentage* is a single user-facing summary statistic and
    # must never claim more than 100% of current spend is reclaimable, so
    # it's clamped here. This clamp affects display only, never the
    # per-suggestion numbers a user would act on.
    cost_reduction_pct = (
        round(min(100.0, 100 * total_savings / current_monthly_run_rate), 2)
        if current_monthly_run_rate > 0
        else 0.0
    )
    optimization_score = 100 - min(100, round(cost_reduction_pct * OPTIMIZATION_SCORE_WEIGHT))

    reduction_pcts = [s.estimated_token_reduction_pct for s in capped if s.estimated_token_reduction_pct > 0]
    potential_token_reduction_pct = round(statistics.fmean(reduction_pcts), 2) if reduction_pcts else 0.0

    critical_count = sum(1 for s in capped if s.severity == "critical")

    aggregates = TokenOptimizationAggregates(
        total_potential_monthly_savings_usd=total_savings,
        potential_token_reduction_pct=potential_token_reduction_pct,
        cost_reduction_pct=cost_reduction_pct,
        optimization_score=max(0, min(100, optimization_score)),
        suggestion_count=len(capped),
        critical_count=critical_count,
    )

    result = TokenOptimizationResult(
        agent=agent_id,
        status="ok",
        period=period,
        aggregates=aggregates,
        suggestions=capped,
        unpriced_models=unpriced_models,
        meta={
            "skipped_categories": ["prompt_optimization", "context_optimization"],
            "skip_reason": (
                "Prompt/Context Optimization require prompt/context text, which the "
                "token_usage JSONB convention does not capture — see ADR-007."
            ),
            "total_tokens_in_range": total_tokens,
        },
    )
    return result.to_dict()
