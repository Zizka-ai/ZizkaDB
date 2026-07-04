from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from services.exceptions import not_found
from typing import Any
from uuid import UUID
from datetime import datetime
import json

from api.deps import get_tenant, assert_agent_allowed
from db.connection import get_pool
from services.event_write import write_event

router = APIRouter()


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
