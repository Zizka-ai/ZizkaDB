import json
import re

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.deps import get_tenant, require_dashboard_session
from db.connection import get_pool
from services.api_keys import (
    assert_and_reserve_api_key_slot,
    create_api_key_record,
    list_api_keys_for_agent,
    revoke_api_key_record,
)
from services.event_write import write_event

router = APIRouter()

_AGENT_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$")


def _validate_agent_id(agent_id: str) -> str:
    agent_id = agent_id.strip()
    if not agent_id or not _AGENT_ID_RE.match(agent_id):
        raise HTTPException(
            status_code=400,
            detail="agent_id must be 1–255 chars: letters, numbers, dots, dashes, underscores",
        )
    return agent_id


class CreateAgentBody(BaseModel):
    agent_id: str = Field(..., min_length=1, max_length=255)
    metadata: dict | None = None
    key_name: str | None = None


class CreateAgentKeyBody(BaseModel):
    name: str | None = None


@router.get("")
async def list_agents(tenant: dict = Depends(get_tenant)):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT
            a.agent_id,
            a.first_seen,
            a.last_seen,
            a.event_count,
            a.metadata,
            COUNT(ak.key_id) FILTER (WHERE ak.revoked = FALSE) AS api_key_count
        FROM agents a
        LEFT JOIN api_keys ak
            ON ak.tenant_id = a.tenant_id AND ak.agent_id = a.agent_id
        WHERE a.tenant_id = $1
        GROUP BY a.agent_id, a.first_seen, a.last_seen, a.event_count, a.metadata
        ORDER BY a.last_seen DESC
        """,
        tenant["tenant_id"],
    )
    return [
        {
            "agent": r["agent_id"],
            "first_seen": r["first_seen"].isoformat(),
            "last_seen": r["last_seen"].isoformat(),
            "event_count": r["event_count"],
            "api_key_count": int(r["api_key_count"] or 0),
        }
        for r in rows
    ]


@router.post("", status_code=201)
async def create_agent(
    body: CreateAgentBody,
    session: dict = Depends(require_dashboard_session),
):
    """Create an agent and its first API key (shown once).

    Agent + first key are created in one transaction so a plan-limit rejection
    (the auto-created key counts against the quota) rolls back the agent instead
    of leaving an agent with no key.
    """
    agent_id = _validate_agent_id(body.agent_id)
    pool = get_pool()
    tenant_id = session["tenant_id"]

    async with pool.acquire() as conn:
        async with conn.transaction():
            existing = await conn.fetchrow(
                "SELECT 1 FROM agents WHERE tenant_id = $1 AND agent_id = $2",
                tenant_id, agent_id,
            )
            if existing:
                raise HTTPException(status_code=409, detail="Agent already exists")

            await assert_and_reserve_api_key_slot(conn, tenant_id=tenant_id)

            await conn.execute(
                """
                INSERT INTO agents (agent_id, tenant_id, metadata)
                VALUES ($1, $2, $3::jsonb)
                """,
                agent_id, tenant_id, json.dumps(body.metadata or {}),
            )

            key_name = body.key_name or f"{agent_id} production"
            api_key = await create_api_key_record(
                conn,
                tenant_id=tenant_id,
                name=key_name,
                agent_id=agent_id,
            )

    return {
        "agent": agent_id,
        "api_key": api_key,
        "message": "Agent and API key created. Save the key now — use it as ZIZKADB_API_KEY or AGENTDB_API_KEY.",
    }


@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    tenant: dict = Depends(get_tenant),
):
    """Delete an agent and all of its events. Cannot be undone."""
    agent_id = _validate_agent_id(agent_id)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    row = await pool.fetchrow(
        "SELECT event_count FROM agents WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Agent not found")

    await pool.execute(
        "UPDATE events SET parent_event_id = NULL WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    await pool.execute(
        "DELETE FROM events WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    await pool.execute(
        "DELETE FROM agents WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    return {
        "deleted": True,
        "agent": agent_id,
        "events_deleted": int(row["event_count"] or 0),
    }


@router.post("/{agent_id}/test-event", status_code=201)
async def test_agent_event(
    agent_id: str,
    tenant: dict = Depends(get_tenant),
):
    """Log a test event to this agent (dashboard JWT). Verifies the pipeline for this agent."""
    agent_id = _validate_agent_id(agent_id)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    exists = await pool.fetchrow(
        "SELECT 1 FROM agents WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Agent not found")

    result = await write_event(
        tenant_id=tenant_id,
        agent=agent_id,
        event="connection_test",
        data={"source": "dashboard_agent_page", "ok": True},
    )
    return {
        **result,
        "agent": agent_id,
        "message": f"Test event recorded for '{agent_id}'. Refresh Events — it should appear within seconds.",
    }


@router.get("/{agent_id}/api-keys")
async def list_agent_api_keys(
    agent_id: str,
    tenant: dict = Depends(get_tenant),
):
    agent_id = _validate_agent_id(agent_id)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    exists = await pool.fetchrow(
        "SELECT 1 FROM agents WHERE tenant_id = $1 AND agent_id = $2",
        tenant_id, agent_id,
    )
    if not exists:
        raise HTTPException(status_code=404, detail="Agent not found")

    return await list_api_keys_for_agent(pool, tenant_id, agent_id)


@router.post("/{agent_id}/api-keys", status_code=201)
async def create_agent_api_key(
    agent_id: str,
    body: CreateAgentKeyBody,
    session: dict = Depends(require_dashboard_session),
):
    agent_id = _validate_agent_id(agent_id)
    pool = get_pool()
    tenant_id = session["tenant_id"]

    async with pool.acquire() as conn:
        async with conn.transaction():
            exists = await conn.fetchrow(
                "SELECT 1 FROM agents WHERE tenant_id = $1 AND agent_id = $2",
                tenant_id, agent_id,
            )
            if not exists:
                raise HTTPException(status_code=404, detail="Agent not found")

            await assert_and_reserve_api_key_slot(conn, tenant_id=tenant_id)

            return await create_api_key_record(
                conn,
                tenant_id=tenant_id,
                name=body.name or f"{agent_id} key",
                agent_id=agent_id,
            )


@router.delete("/{agent_id}/api-keys/{key_id}")
async def revoke_agent_api_key(
    agent_id: str,
    key_id: str,
    tenant: dict = Depends(get_tenant),
):
    agent_id = _validate_agent_id(agent_id)
    pool = get_pool()
    tenant_id = tenant["tenant_id"]

    if not await revoke_api_key_record(pool, tenant_id, key_id, agent_id):
        raise HTTPException(status_code=404, detail="API key not found")
    return {"revoked": True, "key_id": key_id, "agent": agent_id}


@router.get("/{agent_id}/stats")
async def agent_stats(agent_id: str, tenant: dict = Depends(get_tenant)):
    pool = get_pool()

    stats = await pool.fetchrow(
        """
        SELECT
            COUNT(*) AS total_events,
            COUNT(DISTINCT event_type) AS unique_event_types,
            COUNT(DISTINCT session_id) AS sessions,
            MIN(timestamp) AS first_event,
            MAX(timestamp) AS last_event
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2
        """,
        tenant["tenant_id"], agent_id,
    )

    top_events = await pool.fetch(
        """
        SELECT event_type, COUNT(*) AS count
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2
        GROUP BY event_type
        ORDER BY count DESC
        LIMIT 10
        """,
        tenant["tenant_id"], agent_id,
    )

    return {
        "agent": agent_id,
        "total_events": stats["total_events"],
        "unique_event_types": stats["unique_event_types"],
        "sessions": stats["sessions"],
        "first_event": stats["first_event"].isoformat() if stats["first_event"] else None,
        "last_event": stats["last_event"].isoformat() if stats["last_event"] else None,
        "top_events": [{"event": r["event_type"], "count": r["count"]} for r in top_events],
    }


@router.get("/{agent_id}/sessions")
async def list_sessions(
    agent_id: str,
    limit: int = Query(default=50, le=500),
    tenant: dict = Depends(get_tenant),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT
            session_id,
            COUNT(*)                    AS event_count,
            COUNT(DISTINCT event_type)  AS event_types,
            MIN(timestamp)              AS started_at,
            MAX(timestamp)              AS ended_at,
            EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))::int AS duration_seconds,
            array_agg(DISTINCT event_type ORDER BY event_type) AS types
        FROM events
        WHERE tenant_id = $1
          AND agent_id  = $2
          AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY MAX(timestamp) DESC
        LIMIT $3
        """,
        tenant["tenant_id"], agent_id, limit,
    )
    return [
        {
            "session_id":       r["session_id"],
            "event_count":      r["event_count"],
            "event_types":      r["event_types"],
            "started_at":       r["started_at"].isoformat(),
            "ended_at":         r["ended_at"].isoformat(),
            "duration_seconds": r["duration_seconds"] or 0,
            "types":            list(r["types"]),
        }
        for r in rows
    ]


# ── Behavioral baseline ────────────────────────────────────────────────────
#
# A behavioral baseline summarises what is "normal" for an agent across three
# dimensions:
#   1. Event-type distribution        — what does this agent typically emit?
#   2. Parent → child transitions     — what does its decision-tree shape look like?
#   3. Session shape                  — events per session, duration, error rate
#
# We compute the same three things for the most recent 50 sessions and compare
# them against everything before. The result is a drift score plus a list of
# the biggest behavioural changes between the two windows.
#
# This is deliberately observable, not alerting. The dashboard renders the
# baseline so a developer can build trust in it before we wire alerts on top.


def _distribution(rows, key: str) -> dict[str, float]:
    """Convert a list of {key: ..., 'count': N} rows into a percentage dict."""
    total = sum(r["count"] for r in rows) or 1
    return {r[key]: round(100 * r["count"] / total, 2) for r in rows}


def _l1_distance(a: dict[str, float], b: dict[str, float]) -> float:
    """L1 distance between two distributions, normalised to [0, 1]."""
    keys = set(a) | set(b)
    diff = sum(abs(a.get(k, 0) - b.get(k, 0)) for k in keys)
    return round(diff / 200, 4)  # max possible is 200pp -> 1.0


def _biggest_changes(
    label: str, baseline: dict[str, float], recent: dict[str, float], top: int = 5,
) -> list[dict]:
    keys = set(baseline) | set(recent)
    deltas = []
    for k in keys:
        b = baseline.get(k, 0)
        r = recent.get(k, 0)
        deltas.append({
            "metric":   f"{label}.{k}",
            "baseline": b,
            "recent":   r,
            "delta_pp": round(r - b, 2),
        })
    deltas.sort(key=lambda d: abs(d["delta_pp"]), reverse=True)
    return [d for d in deltas[:top] if d["delta_pp"] != 0]


async def _baseline_for(
    pool, tenant_id, agent_id: str, session_ids: list[str],
) -> dict:
    """Compute baseline metrics over the given list of session_ids."""
    if not session_ids:
        return {
            "sessions":               0,
            "events":                 0,
            "event_distribution":     {},
            "transitions":            {},
            "avg_events_per_session": 0,
            "avg_session_seconds":    0,
            "error_rate_pct":         0,
        }

    type_rows = await pool.fetch(
        """
        SELECT event_type AS key, COUNT(*) AS count
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2 AND session_id = ANY($3::text[])
        GROUP BY event_type
        """,
        tenant_id, agent_id, session_ids,
    )

    transition_rows = await pool.fetch(
        """
        SELECT
            p.event_type || ' -> ' || c.event_type AS key,
            COUNT(*) AS count
        FROM events c
        JOIN events p ON c.parent_event_id = p.event_id
        WHERE c.tenant_id = $1 AND c.agent_id = $2 AND c.session_id = ANY($3::text[])
        GROUP BY p.event_type, c.event_type
        ORDER BY count DESC
        LIMIT 20
        """,
        tenant_id, agent_id, session_ids,
    )

    session_stats = await pool.fetchrow(
        """
        WITH s AS (
            SELECT
                session_id,
                COUNT(*) AS events,
                EXTRACT(EPOCH FROM (MAX(timestamp) - MIN(timestamp)))::int AS dur
            FROM events
            WHERE tenant_id = $1 AND agent_id = $2 AND session_id = ANY($3::text[])
            GROUP BY session_id
        )
        SELECT
            AVG(events)::float AS avg_events,
            AVG(dur)::float    AS avg_dur
        FROM s
        """,
        tenant_id, agent_id, session_ids,
    )

    error_rate = await pool.fetchrow(
        """
        SELECT
            COUNT(*) FILTER (
                WHERE event_type ILIKE '%error%'
                   OR event_type ILIKE '%fail%'
                   OR data ? 'error'
            )::float * 100.0 / NULLIF(COUNT(*), 0) AS pct
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2 AND session_id = ANY($3::text[])
        """,
        tenant_id, agent_id, session_ids,
    )

    total_events = sum(r["count"] for r in type_rows)
    return {
        "sessions":               len(session_ids),
        "events":                 total_events,
        "event_distribution":     _distribution(type_rows, "key"),
        "transitions":            _distribution(transition_rows, "key"),
        "avg_events_per_session": round(session_stats["avg_events"] or 0, 2),
        "avg_session_seconds":    round(session_stats["avg_dur"] or 0, 1),
        "error_rate_pct":         round(error_rate["pct"] or 0, 2),
    }


@router.get("/{agent_id}/baseline")
async def agent_baseline(
    agent_id: str,
    recent_window: int = Query(default=50, ge=5, le=500),
    tenant: dict = Depends(get_tenant),
):
    """
    Behavioral baseline for an agent.

    Splits sessions into two windows: the most recent N sessions (`recent`) and
    everything before that (`baseline`). Returns event-type distribution,
    parent->child transition distribution, session shape, and error rate for
    each window, plus a drift score and the largest behavioural deltas.
    """
    pool = get_pool()

    sessions = await pool.fetch(
        """
        SELECT session_id, MAX(timestamp) AS ended_at
        FROM events
        WHERE tenant_id = $1 AND agent_id = $2 AND session_id IS NOT NULL
        GROUP BY session_id
        ORDER BY MAX(timestamp) DESC
        """,
        tenant["tenant_id"], agent_id,
    )

    if not sessions:
        return {
            "agent":         agent_id,
            "status":        "insufficient_data",
            "message":       "No sessions logged yet. Add session_id to your db.log() calls to start building a baseline.",
            "sessions":      0,
            "recent_window": recent_window,
        }

    recent_ids   = [r["session_id"] for r in sessions[:recent_window]]
    baseline_ids = [r["session_id"] for r in sessions[recent_window:]]

    if not baseline_ids:
        return {
            "agent":         agent_id,
            "status":        "warming_up",
            "message":       f"Need at least {recent_window + 1} sessions to compute drift. You have {len(sessions)}. Keep logging.",
            "sessions":      len(sessions),
            "recent_window": recent_window,
            "recent":        await _baseline_for(pool, tenant["tenant_id"], agent_id, recent_ids),
        }

    baseline = await _baseline_for(pool, tenant["tenant_id"], agent_id, baseline_ids)
    recent   = await _baseline_for(pool, tenant["tenant_id"], agent_id, recent_ids)

    drift_score = round(
        0.5 * _l1_distance(baseline["event_distribution"], recent["event_distribution"])
        + 0.5 * _l1_distance(baseline["transitions"],         recent["transitions"]),
        4,
    )

    biggest_changes = (
        _biggest_changes("event_distribution", baseline["event_distribution"], recent["event_distribution"])
        + _biggest_changes("transitions",      baseline["transitions"],         recent["transitions"])
    )
    biggest_changes.sort(key=lambda d: abs(d["delta_pp"]), reverse=True)

    if drift_score < 0.05:
        verdict = "stable"
    elif drift_score < 0.15:
        verdict = "minor_drift"
    elif drift_score < 0.30:
        verdict = "noticeable_drift"
    else:
        verdict = "significant_drift"

    return {
        "agent":         agent_id,
        "status":        "ok",
        "sessions":      len(sessions),
        "recent_window": recent_window,
        "baseline":      baseline,
        "recent":        recent,
        "drift": {
            "score":           drift_score,   # 0 = identical, 1 = totally different
            "verdict":         verdict,
            "biggest_changes": biggest_changes[:8],
            "error_rate_change_pp": round(recent["error_rate_pct"] - baseline["error_rate_pct"], 2),
            "session_length_change_pct": round(
                100 * ((recent["avg_events_per_session"] - baseline["avg_events_per_session"])
                       / (baseline["avg_events_per_session"] or 1)),
                1,
            ),
        },
    }
