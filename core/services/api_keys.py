"""API key create/list/revoke — scoped to tenant and optionally to one agent."""

from __future__ import annotations

import logging

from fastapi import HTTPException

from services.auth import generate_api_key
from services.billing import fetch_tenant_plan
from services.plan_limits import api_key_limit_for_plan, limits_enforced

log = logging.getLogger(__name__)


async def count_active_api_keys(conn, tenant_id: str) -> int:
    """Count non-revoked keys for a tenant (tenant-wide + agent-scoped).

    The ONE counter used by both the create guard and the usage endpoint so the
    enforced limit and the displayed usage can never drift apart.
    """
    return int(
        await conn.fetchval(
            "SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1 AND revoked = FALSE",
            tenant_id,
        )
    )


async def assert_and_reserve_api_key_slot(conn, *, tenant_id: str) -> None:
    """Raise 409 if creating another active key would exceed the plan limit.

    MUST be called inside a transaction on ``conn`` and immediately before the
    insert. A per-tenant advisory lock serializes concurrent creates so the
    count-then-insert cannot race (rapid double-clicks, multiple tabs).

    Fail-open: if the plan lookup errors, creation is allowed — this is a
    plan-limit UX guard, not a security boundary, so a billing hiccup must never
    block a legitimate user.
    """
    if not limits_enforced():
        return

    # Serialize creates for this tenant within the surrounding transaction.
    await conn.execute("SELECT pg_advisory_xact_lock(hashtext($1))", tenant_id)

    try:
        # Read plan on the guard's own connection so it stays inside the
        # advisory lock and never contends for a second pooled connection.
        plan = await fetch_tenant_plan(conn, tenant_id)
    except Exception as e:  # fail-open
        log.warning(
            "api-key limit: plan lookup failed for tenant %s, allowing create: %s",
            tenant_id,
            e,
        )
        return

    limit = api_key_limit_for_plan(plan)
    if limit is None:
        return

    used = await count_active_api_keys(conn, tenant_id)
    if used >= limit:
        raise HTTPException(
            status_code=409,
            detail={
                "msg": (
                    "You've reached the maximum number of API keys allowed on your "
                    f"current plan ({used}/{limit}). Delete an existing API key or "
                    "upgrade your plan to create more."
                ),
                "code": "api_key_limit_reached",
                "plan": plan,
                "limit": limit,
                "used": used,
            },
        )


def _key_row(row) -> dict:
    return {
        "key_id": str(row["key_id"]),
        "prefix": row["key_prefix"],
        "name": row["name"],
        "agent_id": row["agent_id"],
        "created_at": row["created_at"].isoformat(),
        "last_used": row["last_used"].isoformat() if row["last_used"] else None,
    }


async def create_api_key_record(
    db,
    *,
    tenant_id: str,
    name: str | None,
    agent_id: str | None = None,
) -> dict:
    """``db`` is a pool or a transaction connection (used by the create guard)."""
    raw_key, key_hash, prefix = generate_api_key()
    row = await db.fetchrow(
        """
        INSERT INTO api_keys (tenant_id, key_hash, key_prefix, name, agent_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING key_id
        """,
        tenant_id,
        key_hash,
        prefix,
        name,
        agent_id,
    )
    return {
        "key_id": str(row["key_id"]),
        "key": raw_key,
        "prefix": prefix,
        "name": name,
        "agent_id": agent_id,
        "warning": "Save this key — it will not be shown again.",
    }


async def list_api_keys_for_agent(pool, tenant_id: str, agent_id: str) -> list[dict]:
    rows = await pool.fetch(
        """
        SELECT key_id, key_prefix, name, agent_id, created_at, last_used
        FROM api_keys
        WHERE tenant_id = $1 AND agent_id = $2 AND revoked = FALSE
        ORDER BY created_at DESC
        """,
        tenant_id,
        agent_id,
    )
    return [_key_row(r) for r in rows]


async def revoke_api_key_record(pool, tenant_id: str, key_id: str, agent_id: str | None = None) -> bool:
    if agent_id:
        result = await pool.execute(
            """
            UPDATE api_keys SET revoked = TRUE
            WHERE key_id = $1::uuid AND tenant_id = $2::uuid AND agent_id = $3 AND revoked = FALSE
            """,
            key_id,
            tenant_id,
            agent_id,
        )
    else:
        result = await pool.execute(
            """
            UPDATE api_keys SET revoked = TRUE
            WHERE key_id = $1::uuid AND tenant_id = $2::uuid AND revoked = FALSE
            """,
            key_id,
            tenant_id,
        )
    return result != "UPDATE 0"
