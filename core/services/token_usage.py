"""Per-agent token usage / cost aggregation.

Reads token usage from the existing ``events.data`` JSONB column using a
documented convention key, ``token_usage`` — no schema migration, no new
table. See ``docs/adr/006-token-usage-jsonb-convention.md`` for the full
rationale (why JSONB, why hardcoded pricing).

Expected shape of ``data.token_usage`` on an event:

    {
      "model": "claude-sonnet-5",
      "input_tokens": 1200,
      "output_tokens": 340,
      "cached_tokens": 0,
      "reasoning_tokens": 0
    }

Every field is optional and defensively coalesced to 0 in SQL
(``COALESCE(...::bigint, 0)``) so a malformed value (wrong type, missing key)
never raises — it's simply excluded from that event's contribution. Older
events without a ``token_usage`` key are excluded entirely via
``data ? 'token_usage'``, not counted as zero-usage rows.

Reuses ``services.reports`` for UTC parsing / range validation / granularity
resolution rather than re-implementing them (see root CLAUDE.md's
cross-cutting update rules).
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from services import pricing
from services.reports import _ERROR_PREDICATE, _iso_utc

# Range validation (MAX_RANGE_DAYS) happens once at the route layer via
# services.reports.validate_range — reused there, not duplicated here.

UNKNOWN_BUCKET = "Unknown"

# Token-usage endpoint additionally supports 'hour' (for the 24h preset),
# which /report intentionally does not — keep this set separate from
# reports.py's _VALID_GRANULARITY so widening one never widens the other.
_VALID_GRANULARITY = {"hour", "day", "week"}


def _clamp_nonneg(n) -> int:
    """Defensive clamp for malformed JSONB (e.g. a negative int slipped in)."""
    try:
        n = int(n or 0)
    except (TypeError, ValueError):
        return 0
    return max(n, 0)


async def _fetch_rows(pool, tenant_id: str, agent_id: str, from_dt: datetime, to_dt: datetime):
    """Single SQL pass pulling every event carrying a `token_usage` field.

    One row per event (no joins that could fan out rows), so summing in Python
    afterwards cannot double count.
    """
    return await pool.fetch(
        f"""
        SELECT
            event_id,
            timestamp,
            session_id,
            event_type,
            agent_id,
            (data->'token_usage'->>'model') AS model,
            COALESCE((data->'token_usage'->>'input_tokens')::bigint, 0) AS input_tokens,
            COALESCE((data->'token_usage'->>'output_tokens')::bigint, 0) AS output_tokens,
            COALESCE((data->'token_usage'->>'cached_tokens')::bigint, 0) AS cached_tokens,
            COALESCE((data->'token_usage'->>'reasoning_tokens')::bigint, 0) AS reasoning_tokens,
            data->>'workflow' AS workflow,
            metadata->>'tool' AS tool_name,
            metadata->>'user_id' AS user_id,
            ({_ERROR_PREDICATE}) AS is_failed
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2
          AND timestamp >= $3 AND timestamp < $4
          AND data ? 'token_usage'
        """,
        tenant_id, agent_id, from_dt, to_dt,
    )


def _row_metrics(r) -> dict:
    """Per-row token counts + cost, with defensive clamping (never negative)."""
    input_tokens = _clamp_nonneg(r["input_tokens"])
    output_tokens = _clamp_nonneg(r["output_tokens"])
    cached_tokens = _clamp_nonneg(r["cached_tokens"])
    reasoning_tokens = _clamp_nonneg(r["reasoning_tokens"])
    total_tokens = input_tokens + output_tokens + reasoning_tokens
    model = r["model"] or None
    cost = pricing.cost_for(model, input_tokens, output_tokens, cached_tokens)
    return {
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "cached_tokens": cached_tokens,
        "reasoning_tokens": reasoning_tokens,
        "total_tokens": total_tokens,
        "cost": cost,
        "is_failed": bool(r["is_failed"]),
    }


def _empty_bucket() -> dict:
    return {"tokens": 0, "cost": 0.0, "requests": 0}


def _breakdown_from(rows_metrics: list[dict], key_fn) -> list[dict]:
    """Group rows by ``key_fn(row) -> str | None`` into a sorted breakdown list.

    A ``None``/missing key is grouped under the literal ``"Unknown"`` bucket
    (never dropped) so per-dimension totals still reconcile against the
    top-level totals.
    """
    buckets: dict[str, dict] = {}
    for m in rows_metrics:
        key = key_fn(m) or UNKNOWN_BUCKET
        b = buckets.setdefault(key, _empty_bucket())
        b["tokens"] += m["total_tokens"]
        b["cost"] += m["cost"]
        b["requests"] += 1
    out = [
        {"key": k, "tokens": v["tokens"], "cost": round(v["cost"], 6), "requests": v["requests"]}
        for k, v in buckets.items()
    ]
    out.sort(key=lambda r: r["tokens"], reverse=True)
    return out


def _to_naive_utc(ts: datetime) -> datetime:
    """Normalize to naive-UTC, matching services.reports.parse_utc_naive's
    convention. asyncpg returns TIMESTAMPTZ columns as offset-aware datetimes,
    while from_dt/to_dt (and therefore the gap-filled bucket boundaries) are
    always naive — comparing/sorting the two raises TypeError otherwise.
    """
    if ts.tzinfo is not None:
        return ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts


def _bucket_key(ts: datetime, granularity: str) -> datetime:
    ts = _to_naive_utc(ts)
    ts = ts.replace(minute=0, second=0, microsecond=0) if granularity == "hour" else ts
    if granularity == "hour":
        return ts
    if granularity == "day":
        return ts.replace(hour=0)
    # week: align to Monday (ISO), matching reports.py's date_trunc('week', ...) semantics.
    monday = ts - timedelta(days=ts.weekday())
    return monday.replace(hour=0)


def _gap_fill_buckets(from_dt: datetime, to_dt: datetime, granularity: str) -> list[datetime]:
    step = {"hour": timedelta(hours=1), "day": timedelta(days=1), "week": timedelta(weeks=1)}[granularity]
    start = _bucket_key(from_dt, granularity)
    buckets = []
    cur = start
    while cur < to_dt:
        buckets.append(cur)
        cur += step
    if not buckets:
        buckets = [start]
    return buckets


def _trend(rows_metrics: list[dict], timestamps: list[datetime], from_dt, to_dt, granularity) -> list[dict]:
    by_bucket: dict[datetime, dict] = {}
    for m, ts in zip(rows_metrics, timestamps):
        key = _bucket_key(ts, granularity)
        b = by_bucket.setdefault(
            key, {"input_tokens": 0, "output_tokens": 0, "tokens": 0, "cost": 0.0, "requests": 0}
        )
        b["input_tokens"] += m["input_tokens"]
        b["output_tokens"] += m["output_tokens"]
        b["tokens"] += m["total_tokens"]
        b["cost"] += m["cost"]
        b["requests"] += 1

    all_buckets = _gap_fill_buckets(from_dt, to_dt, granularity)
    out = []
    for b in sorted(set(all_buckets) | set(by_bucket.keys())):
        v = by_bucket.get(b, {"input_tokens": 0, "output_tokens": 0, "tokens": 0, "cost": 0.0, "requests": 0})
        out.append(
            {
                "bucket": _iso_utc(b),
                "input_tokens": v["input_tokens"],
                "output_tokens": v["output_tokens"],
                "tokens": v["tokens"],
                "cost": round(v["cost"], 6),
                "requests": v["requests"],
            }
        )
    return out


async def build_token_usage_report(
    pool,
    tenant_id: str,
    agent_id: str,
    from_dt: datetime,
    to_dt: datetime,
    granularity: str,
) -> dict:
    """Assemble the token-usage payload for ``[from_dt, to_dt)``.

    Every field defaults to 0/[]/None gracefully when there are no
    `token_usage`-carrying events in range — an empty state, not an error.
    """
    if granularity not in _VALID_GRANULARITY:
        raise ValueError(f"invalid granularity: {granularity!r}")

    rows = await _fetch_rows(pool, tenant_id, agent_id, from_dt, to_dt)

    metrics = [_row_metrics(r) for r in rows]
    timestamps = [r["timestamp"] for r in rows]

    total_requests = len(metrics)
    total_input = sum(m["input_tokens"] for m in metrics)
    total_output = sum(m["output_tokens"] for m in metrics)
    total_cached = sum(m["cached_tokens"] for m in metrics)
    total_reasoning = sum(m["reasoning_tokens"] for m in metrics)
    total_tokens = sum(m["total_tokens"] for m in metrics)
    total_cost = round(sum(m["cost"] for m in metrics), 6)
    failed_count = sum(1 for m in metrics if m["is_failed"])
    success_count = total_requests - failed_count

    unpriced_models = sorted(
        {m["model"] for m in metrics if m["model"] and not pricing.is_known_model(m["model"])}
    )

    breakdown = {
        "model": _breakdown_from(metrics, lambda m: m["model"]),
        "agent": _breakdown_from(metrics, lambda _m: agent_id),
        "workflow": _breakdown_from(
            [dict(m, _workflow=r["workflow"]) for m, r in zip(metrics, rows)],
            lambda m: m.get("_workflow"),
        ),
        "tool": _breakdown_from(
            [dict(m, _tool=r["tool_name"]) for m, r in zip(metrics, rows)],
            lambda m: m.get("_tool"),
        ),
        "user": _breakdown_from(
            [dict(m, _user=r["user_id"]) for m, r in zip(metrics, rows)],
            lambda m: m.get("_user"),
        ),
    }

    trend = _trend(metrics, timestamps, from_dt, to_dt, granularity)

    return {
        "agent": agent_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "period": {
            "from": _iso_utc(from_dt),
            "to": _iso_utc(to_dt),
            "granularity": granularity,
        },
        "totals": {
            "total_requests": total_requests,
            "success_count": success_count,
            "failed_count": failed_count,
            "success_rate_pct": round(100 * success_count / total_requests, 2) if total_requests else 0.0,
            "total_tokens": total_tokens,
            "input_tokens": total_input,
            "output_tokens": total_output,
            "cached_tokens": total_cached,
            "reasoning_tokens": total_reasoning,
            "avg_tokens_per_request": round(total_tokens / total_requests, 2) if total_requests else 0.0,
            "total_cost": total_cost,
        },
        "unpriced_models": unpriced_models,
        "breakdown": breakdown,
        "trend": trend,
        "top_consumers": {
            dim: rows_[:10] for dim, rows_ in breakdown.items()
        },
    }
