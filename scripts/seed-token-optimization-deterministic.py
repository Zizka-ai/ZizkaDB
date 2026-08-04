#!/usr/bin/env python3
"""Deterministic (non-random) fixture for hand-verifying Token Optimization
suggestions against exact, precomputed numbers via the live API.

Unlike `scripts/seed-token-usage-events.py` (randomized, good for UI/volume
testing but useless for verifying a specific dollar figure is correct), every
event here uses a FIXED model, FIXED token counts, and a FIXED call count so
the expected suggestion output can be computed by hand and asserted exactly.

Ground truth this fixture is designed to produce (see the plan's verification
methodology — one hand-verified suggestion per detector category):

1. model_optimization: 20 calls to gpt-4o, 1000 input + 500 output tokens each.
   gpt-4o combined rate = 0.0125/1k; cheapest candidate <= 50% of that
   (0.00625/1k) across MODEL_PRICING is gemini-1.5-flash (0.000375/1k).
   current_cost = 20 * (1*0.0025 + 0.5*0.01) = 20 * 0.0075 = $0.15
   candidate_cost = 20 * (1*0.000075 + 0.5*0.0003) = 20 * 0.000225 = $0.0045
   expected savings ~= $0.1455/mo (30-day window -> run rate == raw cost).

2. high_consumption: the same 20 gpt-4o calls dominate cost share once mixed
   with a small number of cheap claude-haiku-4-5-20251001 calls (added below)
   -- gpt-4o's share of total cost is designed to clear both the 40% share
   floor and the $5 floor once volume is scaled up (see SCALE below).

3. cache_opportunity: 10 calls to claude-sonnet-5, all ~1000 input tokens
   (same bucket), no cached_tokens.
   savings = (10-1) * (1000/1000) * (0.003 - 0.0003) = 9 * 0.0027 = $0.0243/mo.

4. retry_analysis: 5 consecutive-repeat 'tool_call' events in one session,
   each with 50000 input / 20000 output tokens on claude-sonnet-5.
   cost/call = 50*0.003 + 20*0.015 = 0.45; 5 repeats = $2.25 wasted.

5. cost_anomaly: 5 "normal" days (~$0.0002-0.0003/day) + 1 spike day
   (20 calls x 10000 input/2000 output on claude-sonnet-5, ~$1.2 for the day)
   -- the spike's leave-one-out z-score against the 5 normal days clears the
   2.5 threshold by a wide margin.

Run against a local dev stack (`bash scripts/setup-local.sh` or the native
equivalent). Uses the real SDK write path for the recent-timestamp rows (model
optimization / high consumption / cache / retry) and a direct SQL backfill for
the cost-anomaly day-bucketed data (mirrors seed-token-usage-events.py's
historical-backfill approach, since the SDK write path always stamps NOW()).
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
import sys
from datetime import datetime, timedelta, timezone

from zizkadb import ZizkaDB

AGENT = "token-optimization-deterministic-demo"
HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")

# Scale factor applied to the model-optimization/high-consumption call counts
# so total spend clears the $5 high_consumption_min_cost_usd floor while
# preserving the exact per-call unit economics documented above (scaling
# call COUNT, never per-call token counts, keeps the per-call ground truth
# arithmetic in the docstring exactly reproducible).
SCALE = 120  # 20 * 120 = 2400 gpt-4o calls -> cost = 2400 * 0.0075 = $18


async def seed_model_optimization_and_high_consumption(db: ZizkaDB) -> int:
    total = 0
    # Dominant, expensive model — drives both model_optimization AND
    # high_consumption (its cost share will be ~97%+ of this agent's spend).
    for i in range(20 * SCALE):
        await db.log(
            agent=AGENT,
            event="llm_call",
            data={
                "token_usage": {
                    "model": "gpt-4o",
                    "input_tokens": 1000,
                    "output_tokens": 500,
                    "cached_tokens": 0,
                    "reasoning_tokens": 0,
                },
            },
            session_id=f"det-modelopt-{i // 10:04d}",
        )
        total += 1
    # Small cheap-model minority so high_consumption's cost-SHARE math has a
    # denominator that isn't 100% one model by construction.
    for i in range(2 * SCALE):
        await db.log(
            agent=AGENT,
            event="llm_call",
            data={
                "token_usage": {
                    "model": "claude-haiku-4-5-20251001",
                    "input_tokens": 1000,
                    "output_tokens": 500,
                    "cached_tokens": 0,
                    "reasoning_tokens": 0,
                },
            },
            session_id=f"det-cheap-{i // 10:04d}",
        )
        total += 1
    return total


async def seed_cache_opportunity(db: ZizkaDB) -> int:
    total = 0
    for i in range(10):
        await db.log(
            agent=AGENT,
            event="llm_call",
            data={
                "token_usage": {
                    "model": "claude-sonnet-5",
                    "input_tokens": 1000,
                    "output_tokens": 200,
                    "cached_tokens": 0,
                    "reasoning_tokens": 0,
                },
            },
            session_id=f"det-cache-{i:04d}",
        )
        total += 1
    return total


async def seed_retry_waste(db: ZizkaDB) -> int:
    """5 consecutive-repeat 'tool_call' events in ONE session (required for
    the LAG(...) OVER (PARTITION BY session_id ORDER BY sequence_no) query
    in token_optimization.py to see them as back-to-back repeats)."""
    total = 0
    session_id = "det-retry-0001"
    for _ in range(5):
        await db.log(
            agent=AGENT,
            event="tool_call",
            data={
                "token_usage": {
                    "model": "claude-sonnet-5",
                    "input_tokens": 50000,
                    "output_tokens": 20000,
                    "cached_tokens": 0,
                    "reasoning_tokens": 0,
                },
            },
            session_id=session_id,
        )
        total += 1
    return total


async def seed_cost_anomaly_backfill(pool, tenant_id: str) -> int:
    """Direct SQL insert with spread-out `timestamp`s across 6 distinct daily
    buckets (5 normal + 1 spike), bypassing the HTTP API (which always stamps
    NOW()) — mirrors seed-token-usage-events.py's historical-backfill
    approach exactly."""
    now = datetime.now(timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)
    normal_tokens = [190, 210, 195, 205, 180]  # slight, realistic variance
    total = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            for day_offset, tok in zip(range(5, 0, -1), normal_tokens):
                ts = now - timedelta(days=day_offset)
                data = {
                    "token_usage": {
                        "model": "claude-sonnet-5",
                        "input_tokens": tok,
                        "output_tokens": tok // 5,
                        "cached_tokens": 0,
                        "reasoning_tokens": 0,
                    },
                }
                content = json.dumps({"event": "llm_call", "data": data}, sort_keys=True)
                checksum = hashlib.sha256((content + str(ts)).encode()).hexdigest()
                await conn.execute(
                    """
                    INSERT INTO events (
                        tenant_id, agent_id, event_type, data, timestamp,
                        session_id, checksum
                    )
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
                    """,
                    tenant_id, AGENT, "llm_call", json.dumps(data), ts,
                    f"det-anomaly-{day_offset:02d}", checksum,
                )
                total += 1

            # Spike day: 20 calls, far more tokens than the normal days.
            spike_ts = now  # day_offset 0 = "today"
            for i in range(20):
                data = {
                    "token_usage": {
                        "model": "claude-sonnet-5",
                        "input_tokens": 10000,
                        "output_tokens": 2000,
                        "cached_tokens": 0,
                        "reasoning_tokens": 0,
                    },
                }
                content = json.dumps({"event": "llm_call", "data": data}, sort_keys=True)
                checksum = hashlib.sha256((content + str(spike_ts) + str(i)).encode()).hexdigest()
                await conn.execute(
                    """
                    INSERT INTO events (
                        tenant_id, agent_id, event_type, data, timestamp,
                        session_id, checksum
                    )
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
                    """,
                    tenant_id, AGENT, "llm_call", json.dumps(data), spike_ts,
                    f"det-anomaly-spike-{i:04d}", checksum,
                )
                total += 1

            await conn.execute(
                """
                INSERT INTO agents (agent_id, tenant_id)
                VALUES ($1, $2)
                ON CONFLICT (agent_id, tenant_id)
                DO UPDATE SET last_seen = NOW(), event_count = agents.event_count + $3
                """,
                AGENT, tenant_id, total,
            )
    return total


async def resolve_tenant_id(pool) -> str:
    row = await pool.fetchrow("SELECT tenant_id FROM agents WHERE agent_id = $1 LIMIT 1", AGENT)
    if row:
        return str(row["tenant_id"])
    row = await pool.fetchrow("SELECT tenant_id FROM tenants ORDER BY created_at LIMIT 1")
    if not row:
        raise RuntimeError("No tenant found — log at least one event via the SDK first.")
    return str(row["tenant_id"])


async def main() -> None:
    print(f"-> Seeding DETERMINISTIC token-optimization fixture for agent={AGENT!r} @ {HOST}")

    async with ZizkaDB(host=HOST) as db:
        n1 = await seed_model_optimization_and_high_consumption(db)
        print(f"   ... logged {n1} model-optimization/high-consumption events")
        n2 = await seed_cache_opportunity(db)
        print(f"   ... logged {n2} cache-opportunity events")
        n3 = await seed_retry_waste(db)
        print(f"   ... logged {n3} retry-waste events")

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "core"))
    from db.connection import close_db, get_pool, init_db  # type: ignore

    await init_db()
    pool = get_pool()
    try:
        tenant_id = await resolve_tenant_id(pool)
        n4 = await seed_cost_anomaly_backfill(pool, tenant_id)
        print(f"   ... backfilled {n4} cost-anomaly bucket events via direct SQL")
    finally:
        await close_db()

    print("")
    print(f"OK seeded deterministic fixture for agent={AGENT!r}")
    print("   Hit GET /v1/agents/{}/token-optimization?from=<7d ago>&to=<now> via Swagger".format(AGENT))
    print("   and hand-verify against the ground truth documented in this script's docstring.")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
