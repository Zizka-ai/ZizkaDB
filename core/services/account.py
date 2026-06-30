"""Managed-cloud account lifecycle — delete account or one-time trial extension."""

from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

from db.connection import get_pool, get_qdrant, QDRANT_COLLECTION
from services.billing import billing_enforced, fetch_user_billing

log = logging.getLogger(__name__)

RETENTION_TRIAL_DAYS = int(os.getenv("RETENTION_TRIAL_DAYS", "30"))


def managed_cloud_only() -> bool:
    return billing_enforced()


async def account_options(*, user_id: str) -> dict:
    if not managed_cloud_only():
        return {"managed_cloud": False}

    row = await fetch_user_billing(user_id=user_id)
    if not row:
        return {"managed_cloud": False}

    return {
        "managed_cloud": True,
        "retention_trial_available": not bool(row.get("retention_trial_used")),
        "retention_trial_days": RETENTION_TRIAL_DAYS,
        "trial_ends_at": row["trial_ends_at"].isoformat() if row.get("trial_ends_at") else None,
        "email": row.get("email"),
    }


async def grant_retention_trial(*, user_id: str) -> dict:
    if not managed_cloud_only():
        raise ValueError("Account options are only available on managed cloud")

    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT user_id, email, retention_trial_used, stripe_subscription_id, trial_ends_at
        FROM users WHERE user_id = $1::uuid
        """,
        user_id,
    )
    if not row:
        raise ValueError("Account not found")
    if row["retention_trial_used"]:
        raise ValueError("You have already used your extra free month")

    new_trial_end = datetime.now(timezone.utc) + timedelta(days=RETENTION_TRIAL_DAYS)

    sub_id = row["stripe_subscription_id"]
    if sub_id and os.getenv("STRIPE_SECRET_KEY"):
        try:
            import stripe

            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            stripe.Subscription.modify(
                sub_id,
                trial_end=int(new_trial_end.timestamp()),
            )
        except Exception as e:
            log.error("Stripe trial extension failed for %s: %s", user_id, e)
            raise ValueError("Could not extend trial on billing. Try again or contact support.")

    await pool.execute(
        """
        UPDATE users
        SET trial_ends_at = $2,
            subscription_status = 'trialing',
            retention_trial_used = TRUE
        WHERE user_id = $1::uuid
        """,
        user_id,
        new_trial_end,
    )

    return {
        "message": f"Your trial has been extended by {RETENTION_TRIAL_DAYS} days.",
        "trial_ends_at": new_trial_end.isoformat(),
        "retention_trial_available": False,
    }


async def _purge_tenant_vectors(tenant_id: str) -> None:
    try:
        from qdrant_client.models import FieldCondition, Filter, FilterSelector, MatchValue

        qdrant = get_qdrant()
        await qdrant.delete(
            collection_name=QDRANT_COLLECTION,
            points_selector=FilterSelector(
                filter=Filter(
                    must=[FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id))]
                )
            ),
        )
    except Exception as e:
        log.warning("Qdrant purge for tenant %s failed: %s", tenant_id, e)


async def delete_managed_account(*, user_id: str, tenant_id: str) -> None:
    if not managed_cloud_only():
        raise ValueError("Account deletion is only available on managed cloud")

    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT user_id, email, tenant_id, stripe_subscription_id
        FROM users WHERE user_id = $1::uuid
        """,
        user_id,
    )
    if not row:
        raise ValueError("Account not found")
    if str(row["tenant_id"]) != str(tenant_id):
        raise PermissionError("Tenant mismatch")

    sub_id = row["stripe_subscription_id"]
    if sub_id and os.getenv("STRIPE_SECRET_KEY"):
        try:
            import stripe

            stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
            stripe.Subscription.cancel(sub_id)
        except Exception as e:
            log.error("Stripe cancel failed for %s: %s", user_id, e)
            raise ValueError("Could not cancel subscription. Try again or contact support.")

    email = row["email"]
    tid = str(row["tenant_id"])

    await _purge_tenant_vectors(tid)

    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute("DELETE FROM users WHERE user_id = $1::uuid", user_id)
            await conn.execute("DELETE FROM auth_otps WHERE email = $1", email)
            await conn.execute("DELETE FROM tenants WHERE tenant_id = $1::uuid", tid)

    log.info("Managed account deleted user_id=%s tenant_id=%s", user_id, tid)
