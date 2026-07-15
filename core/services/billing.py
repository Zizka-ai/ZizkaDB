"""Plan selection and trial tracking — no payment provider."""

from __future__ import annotations

import os
from typing import Any

from db.connection import get_pool
from services.entitlements import is_self_hosted_deployment

TRIAL_DAYS = int(os.getenv("TRIAL_DAYS", "30"))

VALID_PLANS = frozenset({"pro", "team"})

# API-key-count feature strings are derived from services.entitlements (the
# single source of truth for the actual limit) so they can never drift from
# what's enforced — changing a limit there updates this copy automatically.
def _valid_plan(plan: str | None) -> bool:
    return bool(plan and plan in VALID_PLANS)


async def fetch_user_billing(*, user_id: str | None = None, email: str | None = None) -> dict | None:
    pool = get_pool()
    if user_id:
        row = await pool.fetchrow(
            """
            SELECT user_id, email, plan, subscription_status, trial_ends_at,
                   retention_trial_used
            FROM users WHERE user_id = $1::uuid
            """,
            user_id,
        )
    elif email:
        row = await pool.fetchrow(
            """
            SELECT user_id, email, plan, subscription_status, trial_ends_at,
                   retention_trial_used
            FROM users WHERE email = $1
            """,
            email.lower().strip(),
        )
    else:
        return None
    if not row:
        return None
    return dict(row)


async def fetch_tenant_plan(executor, tenant_id: str) -> str | None:
    """Resolve the owning user's plan for a tenant."""
    return await executor.fetchval(
        """
        SELECT plan
        FROM users
        WHERE tenant_id = $1::uuid
        ORDER BY created_at ASC
        LIMIT 1
        """,
        tenant_id,
    )


async def fetch_effective_plan(executor, tenant_id: str) -> str | None:
    """Plan to use for entitlement checks.

    Self-hosted deployments always resolve to ``"self_hosted"`` — the
    ``users.plan`` column is unreliable there (self-host installs never set
    it, and ``connection.py``'s ``init_db()`` backfills any NULL plan to
    ``'pro'`` on every boot, which would otherwise silently apply the Pro
    limit instead of the Self-Hosted one).
    """
    if is_self_hosted_deployment():
        return "self_hosted"
    return await fetch_tenant_plan(executor, tenant_id)


async def select_plan(*, user_id: str, plan: str) -> dict | None:
    if not _valid_plan(plan):
        raise ValueError("Invalid plan")
    pool = get_pool()
    await pool.execute(
        f"""
        UPDATE users
        SET plan = $2,
            subscription_status = COALESCE(subscription_status, 'trialing'),
            trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '{TRIAL_DAYS} days')
        WHERE user_id = $1::uuid
        """,
        user_id,
        plan,
    )
    return await fetch_user_billing(user_id=user_id)


def billing_status_payload(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {
            "enforced": False,
            "has_access": True,
            "requires_plan_selection": False,
            "requires_checkout": False,
            "subscription_status": None,
            "trial_ends_at": None,
            "plan": None,
            "trial_days": TRIAL_DAYS,
        }
    return {
        "enforced": False,
        "has_access": True,
        "requires_plan_selection": False,
        "requires_checkout": False,
        "subscription_status": row.get("subscription_status"),
        "trial_ends_at": row["trial_ends_at"].isoformat() if row.get("trial_ends_at") else None,
        "plan": row.get("plan"),
        "trial_days": TRIAL_DAYS,
    }
