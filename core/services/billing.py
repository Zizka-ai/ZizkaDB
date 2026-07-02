"""Stripe subscription billing — 30-day trial with card required upfront."""

from __future__ import annotations

import asyncio
import logging
import os
from datetime import datetime, timezone
from typing import Any

from db.connection import get_pool

log = logging.getLogger(__name__)

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_PUBLISHABLE_KEY = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "")
STRIPE_TEAM_PRICE_ID = os.getenv("STRIPE_TEAM_PRICE_ID", "")
STRIPE_TRIAL_DAYS = int(os.getenv("STRIPE_TRIAL_DAYS", "30"))
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "https://db.zizka.ai").rstrip("/")
_IS_PRODUCTION = os.getenv("ENV", "development") == "production"

ACCESS_STATUSES = frozenset({"trialing", "active"})
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


def _price_id_for_plan(plan: str) -> str | None:
    if plan == "pro":
        return STRIPE_PRO_PRICE_ID or None
    if plan == "team":
        return STRIPE_TEAM_PRICE_ID or None
    return None


def _valid_plan(plan: str | None) -> bool:
    return bool(plan and plan in VALID_PLANS and _price_id_for_plan(plan))


def billing_enforced() -> bool:
    """Managed cloud: require Stripe when ENV=production and both plan prices are configured."""
    return _IS_PRODUCTION and bool(
        STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID and STRIPE_TEAM_PRICE_ID
    )


def available_plans() -> list[dict[str, Any]]:
    """Plans exposed to signup UI (only configured prices)."""
    out: list[dict[str, Any]] = []
    for entry in PLAN_CATALOG:
        if _price_id_for_plan(entry["id"]):
            out.append(dict(entry))
    return out


def has_dashboard_access(row: dict[str, Any] | None) -> bool:
    if not billing_enforced():
        return True
    if not row:
        return False
    # Keep existing users unblocked after billing rollout.
    # New signups are still gated by pending_checkout until Stripe completes.
    return row.get("subscription_status") in ACCESS_STATUSES


def requires_plan_selection(row: dict[str, Any] | None) -> bool:
    """User verified email but has not picked Pro vs Team yet."""
    if not billing_enforced() or has_dashboard_access(row):
        return False
    if not row:
        return True
    return not _valid_plan(row.get("plan"))


def requires_checkout(row: dict[str, Any] | None) -> bool:
    if not billing_enforced() or has_dashboard_access(row):
        return False
    if requires_plan_selection(row):
        return False
    if not row:
        return True
    status = row.get("subscription_status")
    if status in ("past_due", "canceled", "unpaid", "incomplete", "incomplete_expired"):
        return True
    if status in ("pending_checkout", None, ""):
        return True
    return False


async def fetch_user_billing(*, user_id: str | None = None, email: str | None = None) -> dict | None:
    pool = get_pool()
    if user_id:
        row = await pool.fetchrow(
            """
            SELECT user_id, email, plan, subscription_status, trial_ends_at,
                   stripe_customer_id, stripe_subscription_id
            FROM users WHERE user_id = $1::uuid
            """,
            user_id,
        )
    elif email:
        row = await pool.fetchrow(
            """
            SELECT user_id, email, plan, subscription_status, trial_ends_at,
                   stripe_customer_id, stripe_subscription_id
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
    """Resolve the owning user's plan for a tenant.

    Signup creates one tenant per user (see ``services.auth.verify_otp``), so a
    tenant maps to a single owner. If a tenant ever has multiple users, the
    earliest-created (owner) row wins. Returns ``None`` when no user row exists.

    ``executor`` is any asyncpg pool or connection. Pass the guard's own
    transaction connection so the read stays inside its advisory lock; pass the
    pool for read-only callers (e.g. the usage endpoint).
    """
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


async def update_user_billing(
    *,
    user_id: str | None = None,
    email: str | None = None,
    stripe_customer_id: str | None = None,
    stripe_subscription_id: str | None = None,
    plan: str | None = None,
    subscription_status: str | None = None,
    trial_ends_at: datetime | None = None,
) -> bool:
    pool = get_pool()
    if user_id:
        row = await pool.execute(
            """
            UPDATE users SET
                plan = COALESCE($2, plan),
                subscription_status = COALESCE($3, subscription_status),
                trial_ends_at = COALESCE($4, trial_ends_at),
                stripe_customer_id = COALESCE($5, stripe_customer_id),
                stripe_subscription_id = COALESCE($6, stripe_subscription_id)
            WHERE user_id = $1::uuid
            """,
            user_id,
            plan,
            subscription_status,
            trial_ends_at,
            stripe_customer_id,
            stripe_subscription_id,
        )
        return row == "UPDATE 1"
    if email:
        row = await pool.execute(
            """
            UPDATE users SET
                plan = COALESCE($2, plan),
                subscription_status = COALESCE($3, subscription_status),
                trial_ends_at = COALESCE($4, trial_ends_at),
                stripe_customer_id = COALESCE($5, stripe_customer_id),
                stripe_subscription_id = COALESCE($6, stripe_subscription_id)
            WHERE email = $1
            """,
            email.lower().strip(),
            plan,
            subscription_status,
            trial_ends_at,
            stripe_customer_id,
            stripe_subscription_id,
        )
        return row == "UPDATE 1"
    return False


async def mark_pending_checkout(user_id: str) -> None:
    """New managed-cloud signups must add a card before dashboard access."""
    if not billing_enforced():
        return
    pool = get_pool()
    await pool.execute(
        """
        UPDATE users
        SET subscription_status = 'pending_checkout'
        WHERE user_id = $1::uuid
          AND stripe_subscription_id IS NULL
          AND subscription_status IS DISTINCT FROM 'active'
          AND subscription_status IS DISTINCT FROM 'trialing'
        """,
        user_id,
    )


def _stripe():
    if not STRIPE_SECRET_KEY:
        raise RuntimeError("STRIPE_SECRET_KEY is not configured")
    import stripe

    stripe.api_key = STRIPE_SECRET_KEY
    return stripe


def stripe_metadata(raw: Any) -> dict[str, str]:
    """Normalize Stripe metadata (StripeObject) to a plain dict."""
    if not raw:
        return {}
    if isinstance(raw, dict):
        return {str(k): str(v) for k, v in raw.items() if v is not None}
    out: dict[str, str] = {}
    for key in ("user_id", "plan"):
        val = None
        try:
            val = raw[key]
        except (KeyError, TypeError, AttributeError):
            val = getattr(raw, key, None)
        if val is not None:
            out[key] = str(val)
    if out:
        return out
    try:
        return {str(k): str(v) for k, v in dict(raw).items() if v is not None}
    except (TypeError, ValueError):
        return {}


def _stripe_id(value: Any) -> str | None:
    if not value:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "id"):
        return str(value.id)
    return str(value)


async def select_plan(*, user_id: str, plan: str) -> dict | None:
    if not _valid_plan(plan):
        raise ValueError("Invalid plan")
    billing = await fetch_user_billing(user_id=user_id)
    # When billing is enforced, block if already subscribed via Stripe.
    # When billing is not enforced (free trial mode), always allow plan preference to be saved.
    if billing_enforced() and billing and has_dashboard_access(billing):
        raise ValueError("Subscription already active")
    pool = get_pool()
    await pool.execute(
        """
        UPDATE users
        SET plan = $2,
            subscription_status = COALESCE(subscription_status, 'pending_checkout')
        WHERE user_id = $1::uuid
          AND stripe_subscription_id IS NULL
        """,
        user_id,
        plan,
    )
    return await fetch_user_billing(user_id=user_id)


async def create_checkout_session(*, user_id: str, email: str, plan: str) -> dict[str, str]:
    """Stripe Hosted Checkout — redirects user to checkout.stripe.com, then back to ZizkaDB."""
    if not _valid_plan(plan):
        raise ValueError("Invalid plan")
    price_id = _price_id_for_plan(plan)
    if not price_id:
        raise RuntimeError(f"Stripe price for plan '{plan}' is not configured")

    billing = await fetch_user_billing(user_id=user_id)
    if billing and has_dashboard_access(billing):
        raise ValueError("Subscription already active")
    if billing and billing.get("plan") and billing.get("plan") != plan:
        raise ValueError("Selected plan does not match your account")

    stripe = _stripe()
    customer_id = billing.get("stripe_customer_id") if billing else None

    params: dict[str, Any] = {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": price_id, "quantity": 1}],
        "subscription_data": {
            "trial_period_days": STRIPE_TRIAL_DAYS,
            "metadata": {"user_id": user_id, "plan": plan},
        },
        "metadata": {"user_id": user_id, "plan": plan},
        "success_url": f"{DASHBOARD_URL}/signup/success?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{DASHBOARD_URL}/signup/plan?canceled=1",
    }
    if customer_id:
        params["customer"] = customer_id
    else:
        params["customer_email"] = email

    session = stripe.checkout.Session.create(**params)
    if not session.url:
        raise RuntimeError("Stripe did not return a checkout URL")
    return {"url": session.url, "session_id": session.id}


def _checkout_session_ready(session) -> bool:
    """True once Stripe has accepted checkout (may lag redirect by a few seconds)."""
    if getattr(session, "status", None) == "complete":
        return True
    payment_status = getattr(session, "payment_status", None)
    return payment_status in ("paid", "no_payment_required")


async def _grant_checkout_access(
    *,
    user_id: str,
    plan: str,
    status: str,
    trial_end: datetime | None,
    stripe_customer_id: str | None,
    stripe_subscription_id: str | None,
    session_id: str,
) -> bool:
    """Persist trial access after checkout; fall back to status-only update if needed."""
    try:
        if await update_user_billing(
            user_id=user_id,
            plan=plan,
            subscription_status=status,
            trial_ends_at=trial_end,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
        ):
            return True
    except Exception as e:
        log.warning("checkout billing update failed for user %s session %s: %s", user_id, session_id, e)

    pool = get_pool()
    row = await pool.execute(
        """
        UPDATE users SET
            plan = COALESCE($2, plan),
            subscription_status = $3,
            trial_ends_at = COALESCE($4, trial_ends_at)
        WHERE user_id = $1::uuid
        """,
        user_id,
        plan,
        status,
        trial_end,
    )
    if row != "UPDATE 1":
        log.error(
            "checkout access fallback did not update user %s for session %s",
            user_id,
            session_id,
        )
        return False

    if stripe_customer_id or stripe_subscription_id:
        try:
            await update_user_billing(
                user_id=user_id,
                stripe_customer_id=stripe_customer_id,
                stripe_subscription_id=stripe_subscription_id,
            )
        except Exception as e:
            log.warning(
                "checkout stripe id link skipped for user %s session %s: %s",
                user_id,
                session_id,
                e,
            )
    return True


async def sync_checkout_session(session_id: str, *, expected_user_id: str | None = None) -> dict | None:
    """Confirm checkout immediately after redirect (webhook may arrive slightly later)."""
    stripe = _stripe()
    session = None
    for attempt in range(1, 21):
        session = stripe.checkout.Session.retrieve(session_id, expand=["subscription"])
        if _checkout_session_ready(session):
            break
        if attempt == 20:
            log.warning(
                "checkout session %s not ready after retries: status=%s payment=%s",
                session_id,
                getattr(session, "status", None),
                getattr(session, "payment_status", None),
            )
            user_id = stripe_metadata(session.metadata).get("user_id") or expected_user_id
            if user_id:
                return await fetch_user_billing(user_id=user_id)
            return None
        await asyncio.sleep(1.5)

    meta = stripe_metadata(session.metadata)
    # Authenticated confirm-checkout always updates the logged-in user.
    user_id = expected_user_id or meta.get("user_id")
    if not user_id:
        return None
    meta_user_id = meta.get("user_id")
    if expected_user_id and meta_user_id and meta_user_id.lower() != expected_user_id.lower():
        log.warning(
            "checkout session %s metadata user_id %s != authenticated user %s",
            session_id,
            meta_user_id,
            expected_user_id,
        )

    sub = session.subscription
    sub_id = _stripe_id(sub if not isinstance(sub, str) else sub) or _stripe_id(session.subscription)
    status = getattr(sub, "status", None) if sub and not isinstance(sub, str) else None
    # A completed Checkout Session means the customer finished payment/card setup
    # and Stripe accepted it. Card-on-file trials (and 3DS / bank-approved cards)
    # can briefly report the subscription as "incomplete" while Stripe settles.
    # Grant trial access on a completed session and let webhooks downgrade later
    # (e.g. to past_due) if a real charge fails. This avoids bouncing paying users.
    if status not in ("active", "trialing"):
        status = "trialing"
    trial_end = None
    if sub and not isinstance(sub, str) and getattr(sub, "trial_end", None):
        trial_end = datetime.fromtimestamp(sub.trial_end, tz=timezone.utc)

    plan = meta.get("plan") or "pro"
    granted = await _grant_checkout_access(
        user_id=user_id,
        plan=plan,
        status=status or "trialing",
        trial_end=trial_end,
        stripe_customer_id=_stripe_id(session.customer),
        stripe_subscription_id=sub_id,
        session_id=session_id,
    )
    if granted:
        log.info("checkout confirmed for user %s session %s plan=%s", user_id, session_id, plan)
    return await fetch_user_billing(user_id=user_id)


def billing_status_payload(row: dict[str, Any] | None) -> dict[str, Any]:
    if not row:
        return {
            "enforced": billing_enforced(),
            "has_access": not billing_enforced(),
            "requires_plan_selection": False,
            "requires_checkout": False,
            "subscription_status": None,
            "trial_ends_at": None,
            "plan": None,
        }
    return {
        "enforced": billing_enforced(),
        "has_access": has_dashboard_access(row),
        "requires_plan_selection": requires_plan_selection(row),
        "requires_checkout": requires_checkout(row),
        "subscription_status": row.get("subscription_status"),
        "trial_ends_at": row["trial_ends_at"].isoformat() if row.get("trial_ends_at") else None,
        "plan": row.get("plan"),
        "stripe_publishable_key": STRIPE_PUBLISHABLE_KEY if billing_enforced() else None,
        "trial_days": STRIPE_TRIAL_DAYS if billing_enforced() else None,
    }
