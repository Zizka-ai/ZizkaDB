"""Authenticated Stripe checkout — plan selection then redirect to Stripe Hosted Checkout."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator

from api.deps import get_tenant
from services.billing import (
    VALID_PLANS,
    available_plans,
    billing_enforced,
    billing_status_payload,
    create_checkout_session,
    fetch_user_billing,
    select_plan,
    sync_checkout_session,
    STRIPE_PUBLISHABLE_KEY,
    STRIPE_TRIAL_DAYS,
)

router = APIRouter()
log = logging.getLogger(__name__)


class SelectPlanBody(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def normalize_plan(cls, v: str) -> str:
        plan = v.lower().strip()
        if plan not in VALID_PLANS:
            raise ValueError("Plan must be pro or team")
        return plan


class CheckoutSessionBody(BaseModel):
    plan: str

    @field_validator("plan")
    @classmethod
    def normalize_plan(cls, v: str) -> str:
        plan = v.lower().strip()
        if plan not in VALID_PLANS:
            raise ValueError("Plan must be pro or team")
        return plan


class ConfirmCheckoutBody(BaseModel):
    session_id: str


@router.get("/config")
async def billing_config():
    """Public config for signup checkout (publishable key + plan catalog)."""
    enforced = billing_enforced()
    return {
        "enforced": enforced,
        "stripe_publishable_key": STRIPE_PUBLISHABLE_KEY if enforced else None,
        "trial_days": STRIPE_TRIAL_DAYS if enforced else None,
        "plans": available_plans() if enforced else [],
    }


@router.get("/status")
async def billing_status(tenant: dict = Depends(get_tenant)):
    row = await fetch_user_billing(user_id=tenant["user_id"])
    return billing_status_payload(row)


@router.post("/select-plan")
async def choose_plan(body: SelectPlanBody, tenant: dict = Depends(get_tenant)):
    if not billing_enforced():
        raise HTTPException(status_code=400, detail="Billing is not enabled on this instance")

    try:
        row = await select_plan(user_id=tenant["user_id"], plan=body.plan)
        return billing_status_payload(row)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("select plan failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not save plan. Try again.")


@router.post("/checkout-session")
async def start_checkout(body: CheckoutSessionBody, tenant: dict = Depends(get_tenant)):
    if not billing_enforced():
        raise HTTPException(status_code=400, detail="Billing is not enabled on this instance")

    row = await fetch_user_billing(user_id=tenant["user_id"])
    if not row or not row.get("email"):
        raise HTTPException(status_code=400, detail="User not found")

    if row.get("plan") and row.get("plan") != body.plan:
        raise HTTPException(status_code=400, detail="Plan mismatch — return to plan selection")

    try:
        if not row.get("plan"):
            await select_plan(user_id=tenant["user_id"], plan=body.plan)
        session = await create_checkout_session(
            user_id=tenant["user_id"],
            email=row["email"],
            plan=body.plan,
        )
        return session
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        log.error("checkout session failed: %s", e)
        raise HTTPException(status_code=500, detail="Could not start checkout. Try again.")


@router.post("/confirm-checkout")
async def confirm_checkout(body: ConfirmCheckoutBody, tenant: dict = Depends(get_tenant)):
    if not billing_enforced():
        return billing_status_payload(await fetch_user_billing(user_id=tenant["user_id"]))

    try:
        row = await sync_checkout_session(body.session_id, expected_user_id=tenant["user_id"])
        return billing_status_payload(row)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Invalid checkout session")
    except Exception as e:
        log.exception("confirm checkout failed for session %s: %s", body.session_id, e)
        # Don't hard-fail the user flow on transient Stripe/API races.
        # Return current billing status so the client can continue polling.
        row = await fetch_user_billing(user_id=tenant["user_id"])
        return billing_status_payload(row)
