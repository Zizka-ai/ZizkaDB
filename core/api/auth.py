import os
import time
import logging
from typing import Literal

from fastapi import APIRouter, HTTPException, Response
from pydantic import BaseModel, EmailStr
from services.auth import request_otp, verify_otp, _issue_tokens, email_exists
from services.api_keys import (
    assert_and_reserve_api_key_slot,
    count_active_api_keys,
    create_api_key_record,
    revoke_api_key_record,
)
from api.deps import get_tenant, require_dashboard_session
from fastapi import Depends
from db.connection import get_pool
from services.event_write import write_event

router = APIRouter()
log = logging.getLogger(__name__)

# Per-email OTP request limits (in-memory; resets after window)
_OTP_RATE_WINDOW_SEC = 15 * 60   # 15 minutes
_OTP_RATE_MAX = 10               # max requests per email per window
_otp_rate: dict[str, list[float]] = {}


def _check_otp_rate_limit(email: str) -> None:
    key = email.lower().strip()
    now = time.time()
    window_start = now - _OTP_RATE_WINDOW_SEC
    hits = [t for t in _otp_rate.get(key, []) if t > window_start]
    if len(hits) >= _OTP_RATE_MAX:
        raise HTTPException(
            status_code=429,
            detail="Too many code requests. Wait 15 minutes and try again.",
        )
    hits.append(now)
    _otp_rate[key] = hits

_DEV_TENANT_ID = "00000000-0000-0000-0000-000000000001"
_DEV_USER_ID   = "00000000-0000-0000-0000-000000000001"
_DEV_EMAIL     = "dev@localhost"


class RequestOTPBody(BaseModel):
    email: EmailStr
    intent: Literal["signup", "login"] | None = None


class VerifyOTPBody(BaseModel):
    email: EmailStr
    otp: str
    gdpr_consent: bool | None = None
    marketing_consent: bool | None = None


class CreateAPIKeyBody(BaseModel):
    name: str | None = None


@router.post("/request-otp")
async def request_otp_route(body: RequestOTPBody):
    import logging
    log = logging.getLogger(__name__)

    email = body.email.lower().strip()
    _check_otp_rate_limit(email)

    if body.intent == "signup" and await email_exists(email):
        raise HTTPException(
            status_code=409,
            detail="This email is already registered. Please sign in instead.",
        )

    try:
        await request_otp(email)
        return {"message": "Code sent"}
    except Exception as e:
        log.error(f"request_otp failed for {email}: {e}")
        raise HTTPException(status_code=500, detail="Failed to send code. Check server logs.")


@router.post("/verify-otp")
async def verify_otp_route(body: VerifyOTPBody, response: Response):
    email = body.email.lower().strip()
    try:
        tokens = await verify_otp(
            email,
            body.otp,
            gdpr_consent=body.gdpr_consent,
            marketing_consent=body.marketing_consent,
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        log.exception("verify_otp failed for %s: %s", email, e)
        raise HTTPException(
            status_code=500,
            detail="Could not complete account setup. Please request a new code and try again.",
        )

    from services.billing import billing_status_payload, fetch_user_billing

    billing_row = await fetch_user_billing(email=email)
    billing = billing_status_payload(billing_row)

    response.set_cookie(
        key="refresh_token",
        value=tokens["refresh_token"],
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
        path="/",
    )

    return {
        "access_token": tokens["access_token"],
        "token_type": "bearer",
        "requires_plan_selection": billing["requires_plan_selection"],
        "requires_checkout": billing["requires_checkout"],
        "has_access": billing["has_access"],
        "plan": billing["plan"],
    }


@router.post("/api-keys")
async def create_api_key(
    body: CreateAPIKeyBody,
    session: dict = Depends(require_dashboard_session),
):
    """Tenant-wide key (no agent scope). Use for multi-agent apps. Per-agent keys: POST /v1/agents/{id}/api-keys."""
    pool = get_pool()
    tenant_id = session["tenant_id"]
    async with pool.acquire() as conn:
        async with conn.transaction():
            await assert_and_reserve_api_key_slot(conn, tenant_id=tenant_id)
            return await create_api_key_record(
                conn,
                tenant_id=tenant_id,
                name=body.name,
                agent_id=None,
            )


@router.get("/api-keys/usage")
async def api_keys_usage(session: dict = Depends(require_dashboard_session)):
    """Account-wide API key quota for the current plan.

    Returns unlimited whenever enforcement is off or the plan is uncapped, so the
    dashboard UI stays consistent with the backend guard. Fail-open on lookup error.
    """
    from services.billing import fetch_tenant_plan
    from services.plan_limits import api_key_limit_for_plan, limits_enforced

    pool = get_pool()
    tenant_id = session["tenant_id"]
    used = await count_active_api_keys(pool, tenant_id)

    plan: str | None = None
    limit: int | None = None
    if limits_enforced():
        try:
            plan = await fetch_tenant_plan(pool, tenant_id)
            limit = api_key_limit_for_plan(plan)
        except Exception as e:
            log.warning("api-key usage: plan lookup failed for tenant %s: %s", tenant_id, e)
            limit = None

    unlimited = limit is None
    return {
        "plan": plan,
        "limit": limit,
        "used": used,
        "unlimited": unlimited,
        "at_limit": (not unlimited) and used >= limit,
    }


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    tenant: dict = Depends(get_tenant),
):
    """Revoke an API key. The key stops working immediately."""
    pool = get_pool()
    if not await revoke_api_key_record(pool, tenant["tenant_id"], key_id):
        raise HTTPException(status_code=404, detail="API key not found")
    return {"revoked": True, "key_id": key_id}


@router.post("/dev-token")
async def dev_token_route():
    """
    Only works when ENV=development (self-hosted local mode).
    Issues a real JWT for a fixed local dev user so the dashboard
    is accessible without email / signup.
    """
    if os.getenv("ENV", "development") != "development":
        raise HTTPException(status_code=403, detail="Not available in production")

    pool = get_pool()
    await _ensure_dev_tenant(pool)
    tokens = _issue_tokens(_DEV_USER_ID, _DEV_EMAIL, _DEV_TENANT_ID)
    return {"access_token": tokens["access_token"], "token_type": "bearer"}


async def _ensure_dev_tenant(pool) -> None:
    """Idempotently create the dev tenant + user rows if they don't exist."""
    await pool.execute(
        """
        INSERT INTO tenants (tenant_id, name)
        VALUES ($1::uuid, 'Local Dev')
        ON CONFLICT (tenant_id) DO NOTHING
        """,
        _DEV_TENANT_ID,
    )
    await pool.execute(
        """
        INSERT INTO users (user_id, email, tenant_id, last_login)
        VALUES ($1::uuid, $2::text, $3::uuid, NOW())
        ON CONFLICT (email) DO UPDATE SET last_login = NOW()
        """,
        _DEV_USER_ID, _DEV_EMAIL, _DEV_TENANT_ID,
    )


@router.post("/test-event")
async def test_event(tenant: dict = Depends(get_tenant)):
    """
    Log a test event using the dashboard session (JWT).
    Verifies the tenant pipeline without an API key.
    """
    result = await write_event(
        tenant_id=tenant["tenant_id"],
        agent="dashboard-connection-test",
        event="connection_test",
        data={"source": "dashboard_settings", "ok": True},
    )
    return {
        **result,
        "message": "Test event recorded. Check Agents — dashboard-connection-test should appear within seconds.",
    }


@router.get("/api-keys")
async def list_api_keys(tenant: dict = Depends(get_tenant)):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT key_id, key_prefix, name, agent_id, created_at, last_used
        FROM api_keys
        WHERE tenant_id = $1 AND revoked = FALSE
        ORDER BY created_at DESC
        """,
        tenant["tenant_id"],
    )
    return [
        {
            "key_id": str(r["key_id"]),
            "prefix": r["key_prefix"],
            "name": r["name"],
            "agent_id": r["agent_id"],
            "created_at": r["created_at"].isoformat(),
            "last_used": r["last_used"].isoformat() if r["last_used"] else None,
        }
        for r in rows
    ]
