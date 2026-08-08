#!/usr/bin/env python3
"""Seed an agent with many events carrying `data.token_usage`, for exercising
the Token Usage report end-to-end.

Two phases:
  1. Log a batch of "recent" events through the real SDK/API write path
     (exercises event_write.py end-to-end, gets NOW()-ish timestamps for the
     24h/7d filters).
  2. Backfill a larger batch of "historical" events directly via SQL with
     spread-out timestamps across the last N days, so the 30d/90d/6mo/1yr
     presets and the trend chart have real data too. The write path itself
     doesn't accept a timestamp override, so this is the only way to get a
     realistic multi-week distribution without literally waiting weeks.

Covers: multiple models (including one deliberately unpriced model),
workflows, tools, users, success/failure events, and a spread of token
counts, so every breakdown dimension and the cost/unpriced-models UI has
something to show.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import os
import random
import sys
from datetime import datetime, timedelta, timezone

from zizkadb import ZizkaDB

AGENT = "token-usage-demo"
HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")
RECENT_EVENT_COUNT = int(os.getenv("ZIZKADB_SEED_RECENT_EVENTS", "60"))
HISTORICAL_EVENT_COUNT = int(os.getenv("ZIZKADB_SEED_HISTORICAL_EVENTS", "540"))
DAYS_BACK = int(os.getenv("ZIZKADB_SEED_DAYS", "200"))

MODELS = [
    ("claude-sonnet-5", 0.55),
    ("claude-haiku-4-5-20251001", 0.20),
    ("claude-opus-5", 0.08),
    ("gpt-4o-mini", 0.10),
    ("gpt-4o", 0.04),
    ("mystery-internal-model-v3", 0.03),  # deliberately unpriced
]
WORKFLOWS = ["support-triage", "code-review", "summarization", "data-extraction", None]
TOOLS = ["web_search", "lookup_order", "run_sql", "send_email", None]
USERS = [f"user-{i}" for i in range(1, 13)] + [None]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--agent", default=AGENT)
    parser.add_argument("--recent-count", type=int, default=RECENT_EVENT_COUNT)
    parser.add_argument("--historical-count", type=int, default=HISTORICAL_EVENT_COUNT)
    parser.add_argument("--days-back", type=int, default=DAYS_BACK)
    return parser.parse_args()


def weighted_choice(pairs):
    items, weights = zip(*pairs)
    return random.choices(items, weights=weights, k=1)[0]


def random_event_payload(i: int) -> tuple[str, dict, dict]:
    model = weighted_choice(MODELS)
    workflow = random.choice(WORKFLOWS)
    tool = random.choice(TOOLS)
    user = random.choice(USERS)

    input_tokens = random.randint(200, 4000)
    output_tokens = random.randint(50, 1500)
    cached_tokens = random.choice([0, 0, 0, random.randint(0, min(input_tokens, 1000))])
    reasoning_tokens = random.choice([0, 0, 0, 0, random.randint(0, 800)])

    is_failed = random.random() < 0.07
    event_type = "llm_call_error" if is_failed else "llm_call"

    data = {
        "token_usage": {
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "cached_tokens": cached_tokens,
            "reasoning_tokens": reasoning_tokens,
        },
        "workflow": workflow,
    }
    if is_failed:
        data["error"] = "simulated timeout"

    metadata = {}
    if tool:
        metadata["tool"] = tool
    if user:
        metadata["user_id"] = user

    return event_type, data, (metadata or None)


async def seed_recent(db: ZizkaDB, agent: str, count: int) -> int:
    total = 0
    for i in range(1, count + 1):
        event_type, data, metadata = random_event_payload(i)
        await db.log(
            agent=agent,
            event=event_type,
            data=data,
            metadata=metadata,
            session_id=f"seed-recent-session-{(i - 1) // 5 + 1:04d}",
        )
        total += 1
    return total


async def seed_historical(pool, tenant_id: str, agent: str, count: int, days_back: int) -> int:
    """Direct SQL insert with a spread-out `timestamp`, bypassing the HTTP API
    (which always stamps NOW()). Mirrors event_write.py's INSERT shape closely
    enough for the token_usage aggregation to read it correctly; skips the
    Qdrant/embedding side-effects since we only need Postgres rows here.
    """
    now = datetime.now(timezone.utc)
    total = 0
    async with pool.acquire() as conn:
        async with conn.transaction():
            for i in range(1, count + 1):
                event_type, data, metadata = random_event_payload(i)
                day_offset = int(random.triangular(0, days_back, 0))
                ts = now - timedelta(
                    days=day_offset,
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )
                content = json.dumps({"event": event_type, "data": data}, sort_keys=True)
                checksum = hashlib.sha256(content.encode()).hexdigest()

                await conn.execute(
                    """
                    INSERT INTO events (
                        tenant_id, agent_id, event_type, data, timestamp,
                        session_id, checksum, metadata
                    )
                    VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::jsonb)
                    """,
                    tenant_id,
                    agent,
                    event_type,
                    json.dumps(data),
                    ts,
                    f"seed-hist-session-{(i - 1) // 5 + 1:04d}",
                    checksum,
                    json.dumps(metadata) if metadata else None,
                )
                total += 1
            await conn.execute(
                """
                INSERT INTO agents (agent_id, tenant_id)
                VALUES ($1, $2)
                ON CONFLICT (agent_id, tenant_id)
                DO UPDATE SET last_seen = NOW(), event_count = agents.event_count + $3
                """,
                agent,
                tenant_id,
                total,
            )
    return total


async def resolve_tenant_id(pool, agent: str) -> str:
    row = await pool.fetchrow("SELECT tenant_id FROM agents WHERE agent_id = $1 LIMIT 1", agent)
    if row:
        return str(row["tenant_id"])
    # Dev tenant fallback (seeded by init_db() when ENV=development).
    row = await pool.fetchrow("SELECT tenant_id FROM tenants ORDER BY created_at LIMIT 1")
    if not row:
        raise RuntimeError("No tenant found — log at least one event via the SDK first.")
    return str(row["tenant_id"])


async def main(args: argparse.Namespace) -> None:
    agent = args.agent
    print(f"-> Seeding token-usage events for agent={agent!r} @ {HOST}")
    print(f"   recent={args.recent_count}, historical={args.historical_count} over last {args.days_back} days")

    async with ZizkaDB(host=HOST) as db:
        recent_total = await seed_recent(db, agent, args.recent_count)
        print(f"   ... logged {recent_total} recent events via API")

    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "core"))
    from db.connection import close_db, get_pool, init_db  # type: ignore

    await init_db()
    pool = get_pool()
    try:
        tenant_id = await resolve_tenant_id(pool, agent)
        hist_total = await seed_historical(pool, tenant_id, agent, args.historical_count, args.days_back)
        print(f"   ... backfilled {hist_total} historical events via direct SQL")
    finally:
        await close_db()

    grand_total = recent_total + hist_total
    print("")
    print(f"OK logged {grand_total} token_usage events for agent={agent!r}")
    print("   Open the dashboard -> Reports -> Token Usage, select this agent, and try each period preset.")


if __name__ == "__main__":
    try:
        asyncio.run(main(parse_args()))
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        print(
            "\nStart the stack first:\n"
            "  bash scripts/bootstrap-local.sh\n"
            "  bash scripts/restart-native-stack.sh\n",
            file=sys.stderr,
        )
        sys.exit(1)
