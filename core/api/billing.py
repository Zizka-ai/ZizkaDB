"""
Stripe webhooks — sync subscription state to users table.
Point Stripe to POST https://db.zizka.ai/v1/webhooks/stripe (same Stripe account as zizka.ai).
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request

from services.billing import update_user_billing, stripe_metadata

router = APIRouter()
log = logging.getLogger(__name__)

STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")


@router.post("/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Stripe webhook not configured")

    try:
        import stripe
    except ImportError:
        raise HTTPException(status_code=500, detail="stripe package not installed")

    stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
    payload = await request.body()
    sig = request.headers.get("stripe-signature")
    if not sig:
        raise HTTPException(status_code=400, detail="Missing stripe-signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig, STRIPE_WEBHOOK_SECRET)
    except Exception as e:
        log.warning("Stripe webhook verify failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    data = event.data.object
    etype = event.type

    try:
        if etype == "checkout.session.completed":
            meta = stripe_metadata(getattr(data, "metadata", None))
            user_id = meta.get("user_id")
            plan = meta.get("plan", "pro")
            sub_id = getattr(data, "subscription", None)
            customer_id = getattr(data, "customer", None)
            trial_end = None
            status = "trialing"
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                status = sub.status
                if status not in ("active", "trialing"):
                    status = "trialing"
                if sub.trial_end:
                    trial_end = datetime.fromtimestamp(sub.trial_end, tz=timezone.utc)
            await update_user_billing(
                user_id=user_id,
                plan=plan,
                subscription_status=status,
                trial_ends_at=trial_end,
                stripe_customer_id=str(customer_id) if customer_id else None,
                stripe_subscription_id=str(sub_id) if sub_id else None,
            )

        elif etype in ("customer.subscription.updated", "customer.subscription.created"):
            sub = data
            meta = stripe_metadata(getattr(sub, "metadata", None))
            user_id = meta.get("user_id")
            trial_end = None
            if getattr(sub, "trial_end", None):
                trial_end = datetime.fromtimestamp(sub.trial_end, tz=timezone.utc)
            await update_user_billing(
                user_id=user_id,
                stripe_subscription_id=getattr(sub, "id", None),
                stripe_customer_id=str(sub.customer) if getattr(sub, "customer", None) else None,
                subscription_status=getattr(sub, "status", None),
                trial_ends_at=trial_end,
                plan=meta.get("plan"),
            )

        elif etype == "customer.subscription.deleted":
            sub = data
            meta = stripe_metadata(getattr(sub, "metadata", None))
            user_id = meta.get("user_id")
            await update_user_billing(
                user_id=user_id,
                subscription_status="canceled",
            )

        elif etype == "invoice.payment_failed":
            inv = data
            sub_id = getattr(inv, "subscription", None)
            if sub_id:
                sub = stripe.Subscription.retrieve(sub_id)
                meta = stripe_metadata(getattr(sub, "metadata", None))
                await update_user_billing(
                    user_id=meta.get("user_id"),
                    stripe_subscription_id=sub.id,
                    subscription_status=sub.status,
                )

    except Exception as e:
        log.error("Stripe webhook handler error: %s", e)
        raise HTTPException(status_code=500, detail="Webhook handler failed")

    return {"received": True}
