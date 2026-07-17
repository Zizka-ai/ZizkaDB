"""Authenticated plan selection and billing status."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends
from services.exceptions import bad_request, internal_error
from pydantic import BaseModel, field_validator

from api.deps import require_dashboard_session
from services.billing import (
    VALID_PLANS,
    billing_status_payload,
    fetch_user_billing,
    select_plan,
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


@router.get("/status")
async def billing_status(tenant: dict = Depends(require_dashboard_session)):
    row = await fetch_user_billing(user_id=tenant["user_id"])
    return billing_status_payload(row)


@router.post("/select-plan")
async def choose_plan(body: SelectPlanBody, tenant: dict = Depends(require_dashboard_session)):
    try:
        row = await select_plan(user_id=tenant["user_id"], plan=body.plan)
        return billing_status_payload(row)
    except ValueError as e:
        raise bad_request(str(e))
    except Exception as e:
        log.error("select plan failed: %s", e)
        raise internal_error("Could not save plan. Try again.")
