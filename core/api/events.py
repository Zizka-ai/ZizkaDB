import os
import logging

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from services.exceptions import not_found
from typing import Any
from uuid import UUID
from datetime import datetime
import json

from api.deps import get_tenant, assert_agent_allowed
from db.connection import get_pool
from services.event_write import write_event
from services.exceptions import rate_limit_exceeded
from services.rate_limiter import (
    RateLimiter,
    InMemoryStorage,
    RedisStorage,
    RateLimitStorage,
    SlidingWindowStrategy,
)

router = APIRouter()
log = logging.getLogger(__name__)

# Per-agent burst limit on event writes (issue #3 -- Rate limit), keyed on
# (tenant, agent) rather than tenant alone so one runaway agent can't starve
# its sibling agents' write budget within the same tenant. Default allows
# ~5 writes/sec sustained with headroom for bursts; tune via env without a
# code change.
#
# 300/60s is a reasonable-sounding default, not a number benchmarked against
# Postgres/Qdrant's actual write throughput -- issue #85 doesn't specify a
# target either. Worth a maintainer call on the right ceiling before this
# ships to production traffic.
_EVENTS_RATE_WINDOW_SEC = int(os.getenv("EVENTS_RATE_LIMIT_WINDOW_SEC", "60"))
_EVENTS_RATE_MAX = int(os.getenv("EVENTS_RATE_LIMIT_MAX", "300"))


def _events_write_storage() -> RateLimitStorage:
    """
    EVENTS_RATE_LIMIT_STORAGE=redis|memory overrides the default. Default:
    redis when ENV=production (shared across uvicorn workers — same
    rationale as the OTP limiter, see api/auth.py::_otp_storage and
    docs/adr/005-in-process-rate-limiting.md), memory otherwise (local dev
    + unit tests).
    """
    choice = (os.getenv("EVENTS_RATE_LIMIT_STORAGE") or "").strip().lower()
    if not choice:
        choice = "redis" if os.getenv("ENV", "development") == "production" else "memory"
    if choice == "redis":
        return RedisStorage(key_prefix="events-write")
    return InMemoryStorage()


write_limiter = RateLimiter(
    limit=_EVENTS_RATE_MAX,
    window_sec=_EVENTS_RATE_WINDOW_SEC,
    storage=_events_write_storage(),
    strategy=SlidingWindowStrategy(),
    detail=(
        f"Too many events written for this agent. "
        f"Limit is {_EVENTS_RATE_MAX} per {_EVENTS_RATE_WINDOW_SEC}s — see Retry-After header."
    ),
)


# ─────────────────────────────────────────
# MODELS
# ─────────────────────────────────────────

class LogEventRequest(BaseModel):
    agent: str = Field(..., min_length=1, max_length=255)
    event: str = Field(..., min_length=1, max_length=255)
    data: dict[str, Any]
    parent_id: str | None = None
    session_id: str | None = None
    metadata: dict[str, Any] | None = None


# ─────────────────────────────────────────
# LOG EVENT — POST /v1/events
# ─────────────────────────────────────────

@router.post("", status_code=201)
async def log_event(
    body: LogEventRequest,
    tenant: dict = Depends(get_tenant),
):
    assert_agent_allowed(tenant, body.agent)

    try:
        await write_limiter.check(f"{tenant['tenant_id']}:{body.agent}")
    except HTTPException as exc:
        if exc.status_code == 429:
            # Re-raise with a structured body (message + numeric fields) on
            # top of the existing headers, instead of the shared limiter's
            # plain-text `detail`. Done here rather than in rate_limiter.py
            # so OTP -- which shares that limiter and asserts `detail` is a
            # bare string -- is unaffected.
            retry_after = int((exc.headers or {}).get("Retry-After", _EVENTS_RATE_WINDOW_SEC))
            raise rate_limit_exceeded(
                detail={
                    "message": exc.detail,
                    "retry_after_seconds": retry_after,
                    "limit": _EVENTS_RATE_MAX,
                    "window_seconds": _EVENTS_RATE_WINDOW_SEC,
                },
                headers=exc.headers,
            ) from None
        raise
    except Exception:
        # Fail open: unlike OTP (a brute-force guard), losing burst
        # protection during a backend blip is cheaper than blocking all
        # event ingestion because of it.
        log.exception("Event rate limit backend unavailable; allowing write")

    return await write_event(
        tenant_id=tenant["tenant_id"],
        agent=body.agent,
        event=body.event,
        data=body.data,
        parent_id=body.parent_id,
        session_id=body.session_id,
        metadata=body.metadata,
    )


# ─────────────────────────────────────────
# QUERY EVENTS — GET /v1/events
# ─────────────────────────────────────────

@router.get("")
async def query_events(
    agent: str,
    limit: int  = Query(default=50, le=1000),
    offset: int = Query(default=0, ge=0),
    before: datetime | None = None,
    after: datetime | None = None,
    event_type: str | None = None,
    session_id: str | None = None,
    tenant: dict = Depends(get_tenant),
):
    assert_agent_allowed(tenant, agent)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    conditions = ["tenant_id = $1", "agent_id = $2"]
    params: list[Any] = [tenant_id, agent]
    i = 3

    if before:
        conditions.append(f"timestamp < ${i}")
        params.append(before)
        i += 1
    if after:
        conditions.append(f"timestamp > ${i}")
        params.append(after)
        i += 1
    if event_type:
        conditions.append(f"event_type = ${i}")
        params.append(event_type)
        i += 1
    if session_id:
        conditions.append(f"session_id = ${i}")
        params.append(session_id)
        i += 1

    params.extend([limit, offset])
    where = " AND ".join(conditions)

    rows = await pool.fetch(
        f"""
        SELECT event_id, agent_id, timestamp, event_type,
               data, parent_event_id, session_id, sequence_no, metadata
        FROM events
        WHERE {where}
        ORDER BY timestamp DESC
        LIMIT ${i} OFFSET ${i + 1}
        """,
        *params,
    )

    return [_format_event(r) for r in rows]


# ─────────────────────────────────────────
# WHY — GET /v1/events/{event_id}/why
# Causal chain: walk parent_event_id tree
# ─────────────────────────────────────────

@router.get("/{event_id}/why")
async def why(
    event_id: str,
    depth: int = Query(default=10, le=50),
    tenant: dict = Depends(get_tenant),
):
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    try:
        UUID(event_id)
    except ValueError:
        raise not_found("Event not found")

    rows = await pool.fetch(
        """
        WITH RECURSIVE causal_chain AS (
            SELECT
                event_id, agent_id, timestamp, event_type,
                data, parent_event_id, session_id, sequence_no,
                0 AS depth
            FROM events
            WHERE event_id = $1 AND tenant_id = $2

            UNION ALL

            SELECT
                e.event_id, e.agent_id, e.timestamp, e.event_type,
                e.data, e.parent_event_id, e.session_id, e.sequence_no,
                cc.depth + 1
            FROM events e
            INNER JOIN causal_chain cc ON e.event_id = cc.parent_event_id
            WHERE e.tenant_id = $2 AND cc.depth < $3
        )
        SELECT * FROM causal_chain
        ORDER BY depth DESC, timestamp ASC
        """,
        event_id, tenant_id, depth,
    )

    if not rows:
        raise not_found("Event not found")

    return {
        "event_id": event_id,
        "chain_length": len(rows),
        "chain": [_format_event(r) for r in rows],
    }


# ─────────────────────────────────────────
# TIME TRAVEL — GET /v1/events/at
# Reconstruct agent state at a given time
# ─────────────────────────────────────────

@router.get("/at")
async def time_travel(
    agent: str,
    timestamp: datetime,
    tenant: dict = Depends(get_tenant),
):
    assert_agent_allowed(tenant, agent)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    rows = await pool.fetch(
        """
        SELECT event_id, agent_id, timestamp, event_type,
               data, parent_event_id, session_id, sequence_no
        FROM events
        WHERE tenant_id = $1
          AND agent_id = $2
          AND timestamp <= $3
        ORDER BY timestamp ASC
        """,
        tenant_id, agent, timestamp,
    )

    # Reduce events to state (event sourcing pattern)
    state: dict[str, Any] = {}
    for row in rows:
        data = json.loads(row["data"]) if isinstance(row["data"], str) else dict(row["data"])
        if row["event_type"] == "STATE_SET":
            state.update(data)
        elif row["event_type"] == "STATE_DELETE":
            state.pop(data.get("key", ""), None)
        else:
            state["_last_event"] = {
                "event_id": str(row["event_id"]),
                "type": row["event_type"],
                "timestamp": row["timestamp"].isoformat(),
                "data": data,
            }

    return {
        "agent": agent,
        "at": timestamp.isoformat(),
        "event_count": len(rows),
        "state": state,
    }


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def _format_event(row) -> dict:
    data = row["data"]
    if isinstance(data, str):
        data = json.loads(data)

    return {
        "event_id": str(row["event_id"]),
        "agent": row["agent_id"],
        "timestamp": row["timestamp"].isoformat(),
        "event": row["event_type"],
        "data": dict(data),
        "parent_id": str(row["parent_event_id"]) if row["parent_event_id"] else None,
        "session_id": row["session_id"],
        "sequence_no": row["sequence_no"],
    }
