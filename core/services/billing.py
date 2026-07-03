"""Plan selection and trial tracking — no payment provider."""

from __future__ import annotations

import os
from typing import Any

from db.connection import get_pool

TRIAL_DAYS = int(os.getenv("TRIAL_DAYS", "30"))

VALID_PLANS = frozenset({"pro", "team"})

PLAN_CATALOG: list[dict[str, Any]] = [
    {
        "id": "pro",
        "name": "Pro",
        "price": "€39",
        "price_sub": "/ month",
        "highlight": True,
        "features": ["100M events", "90-day retention", "3 projects", "Email support"],
    },
    {
        "id": "team",
        "name": "Team",
        "price": "€99",
        "price_sub": "/ month",
        "highlight": False,
        "features": ["Up to 1B events/mo", "1-year retention", "10 seats", "Priority support"],
    },
]


def _valid_plan(plan: str | None) -> bool:
    return bool(plan and plan in VALID_PLANS)


def available_plans() -> list[dict[str, Any]]:
    return [dict(entry) for entry in PLAN_CATALOG]


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
