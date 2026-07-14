"""
ZizkaDB admin panel.

A single-tenant admin dashboard for the operator (founder@zizka.ai).
Reuses the existing passwordless OTP email flow but locks login to one
allow-listed email. Issues a JWT with an `is_admin: true` claim that
gates every data endpoint here.

There is intentionally no signup. There is intentionally no other user.
If a different email hits any of these routes the server replies 404,
not 403, so the existence of the panel is not advertised.

Two data surfaces:
  - /telemetry/*  — anonymous SDK / MCP install pings
  - /managed/*    — signed-up customers of the managed service
"""

from __future__ import annotations

import os
import logging
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Query, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, EmailStr

from db.connection import get_pool
from api.auth import _check_otp_rate_limit
from services.auth import JWT_SECRET, request_otp, verify_otp

router = APIRouter()
log = logging.getLogger(__name__)

ADMIN_EMAIL          = os.getenv("ADMIN_EMAIL", "founder@zizka.ai").lower()
ADMIN_TOKEN_TTL_HOURS = 24 * 7   # 7 days


# ── Auth ──────────────────────────────────────────────────────────────────────

bearer = HTTPBearer(auto_error=False)


class AdminOTPRequest(BaseModel):
    email: EmailStr


class AdminOTPVerify(BaseModel):
    email: EmailStr
    otp:   str


def _is_admin_email(email: str) -> bool:
    return email.lower().strip() == ADMIN_EMAIL


def _issue_admin_token() -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "sub":      "admin",
            "email":    ADMIN_EMAIL,
            "is_admin": True,
            "iat":      now,
            "exp":      now + timedelta(hours=ADMIN_TOKEN_TTL_HOURS),
        },
        JWT_SECRET,
        algorithm="HS256",
    )


async def require_admin(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=404, detail="Not Found")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except Exception:
        raise HTTPException(status_code=404, detail="Not Found")

    if not payload.get("is_admin") or not _is_admin_email(payload.get("email", "")):
        raise HTTPException(status_code=404, detail="Not Found")
    return payload


# ── Auth routes ───────────────────────────────────────────────────────────────

@router.post("/auth/request-otp")
async def admin_request_otp(body: AdminOTPRequest):
    if not _is_admin_email(body.email):
        raise HTTPException(status_code=404, detail="Not Found")
    _check_otp_rate_limit(ADMIN_EMAIL)
    try:
        await request_otp(ADMIN_EMAIL)
    except Exception as e:
        log.error(f"admin OTP send failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to send code")
    return {"message": "Code sent"}


@router.post("/auth/verify-otp")
async def admin_verify_otp(body: AdminOTPVerify):
    if not _is_admin_email(body.email):
        raise HTTPException(status_code=404, detail="Not Found")
    try:
        # We reuse verify_otp() to validate + consume the OTP record.
        # We discard its returned tokens; admin gets a separately minted
        # token with is_admin=true and no tenant context.
        await verify_otp(ADMIN_EMAIL, body.otp, intent="login")
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))

    return {"access_token": _issue_admin_token(), "token_type": "bearer"}


# ── Overview ──────────────────────────────────────────────────────────────────

@router.get("/overview")
async def admin_overview(_: dict = Depends(require_admin)):
    pool = get_pool()

    telemetry = await pool.fetchrow(
        """
        SELECT
            COUNT(*)                                                       AS total_installs,
            COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '7 days')  AS active_7d,
            COUNT(*) FILTER (WHERE last_seen > NOW() - INTERVAL '24 hours') AS active_24h,
            COALESCE(SUM(ping_count), 0)::bigint                            AS total_pings
        FROM sdk_telemetry
        """
    )

    managed = await pool.fetchrow(
        """
        SELECT
            (SELECT COUNT(*) FROM users)                                 AS users,
            (SELECT COUNT(*) FROM tenants)                               AS tenants,
            (SELECT COUNT(*) FROM api_keys WHERE revoked = FALSE)        AS active_keys,
            (SELECT COUNT(*) FROM events)                                AS total_events,
            (SELECT COUNT(*) FROM events
                WHERE timestamp > NOW() - INTERVAL '24 hours')           AS events_24h
        """
    )

    return {
        "telemetry":    dict(telemetry) if telemetry else {},
        "managed":      dict(managed)   if managed   else {},
        "admin_email":  ADMIN_EMAIL,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Telemetry (SDKs / MCP / self-hosted installs) ────────────────────────────

@router.get("/telemetry/summary")
async def admin_telemetry_summary(_: dict = Depends(require_admin)):
    pool = get_pool()

    by_sdk = await pool.fetch(
        """
        SELECT sdk, COUNT(*) AS installs, COALESCE(SUM(ping_count), 0)::bigint AS pings
        FROM sdk_telemetry GROUP BY sdk ORDER BY installs DESC
        """
    )
    by_mode = await pool.fetch(
        "SELECT mode, COUNT(*) AS installs FROM sdk_telemetry GROUP BY mode ORDER BY installs DESC"
    )
    by_os = await pool.fetch(
        "SELECT os, COUNT(*) AS installs FROM sdk_telemetry GROUP BY os ORDER BY installs DESC"
    )
    by_version = await pool.fetch(
        """
        SELECT sdk, sdk_version, COUNT(*) AS installs
        FROM sdk_telemetry GROUP BY sdk, sdk_version
        ORDER BY sdk, sdk_version DESC LIMIT 30
        """
    )
    daily = await pool.fetch(
        """
        SELECT DATE(first_seen) AS day, COUNT(*) AS new_installs
        FROM sdk_telemetry
        WHERE first_seen > NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day
        """
    )

    return {
        "by_sdk":     [dict(r) for r in by_sdk],
        "by_mode":    [dict(r) for r in by_mode],
        "by_os":      [dict(r) for r in by_os],
        "by_version": [dict(r) for r in by_version],
        "daily_new_installs": [
            {"day": r["day"].isoformat(), "new_installs": r["new_installs"]} for r in daily
        ],
    }


@router.get("/telemetry/recent")
async def admin_telemetry_recent(
    limit: int = 50,
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT install_id, sdk, sdk_version, runtime, os, mode,
               first_seen, last_seen, ping_count
        FROM sdk_telemetry
        ORDER BY last_seen DESC
        LIMIT $1
        """,
        max(1, min(limit, 500)),
    )
    return [
        {
            # truncate the install_id; we never need to expose the full anonymous id
            "install_id":  (r["install_id"][:8] + "…") if r["install_id"] else "—",
            "sdk":         r["sdk"],
            "sdk_version": r["sdk_version"],
            "runtime":     r["runtime"],
            "os":          r["os"],
            "mode":        r["mode"],
            "first_seen":  r["first_seen"].isoformat(),
            "last_seen":   r["last_seen"].isoformat(),
            "ping_count":  r["ping_count"],
        }
        for r in rows
    ]


# ── Managed service (signed-up customers) ────────────────────────────────────

@router.get("/managed/overview")
async def admin_managed_overview(_: dict = Depends(require_admin)):
    """Signup and subscription counts for managed-cloud customers."""
    pool = get_pool()
    row = await pool.fetchrow(
        """
        SELECT
            (SELECT COUNT(*) FROM users) AS total_users,
            (SELECT COUNT(*) FROM users
                WHERE created_at > NOW() - INTERVAL '7 days') AS signups_7d,
            (SELECT COUNT(*) FROM users
                WHERE subscription_status IN ('trialing', 'active', 'past_due')) AS subscribers,
            (SELECT COUNT(*) FROM users
                WHERE subscription_status = 'trialing') AS trialing,
            (SELECT COUNT(*) FROM users
                WHERE subscription_status = 'active') AS active_paid,
            (SELECT COUNT(DISTINCT u.user_id) FROM users u
                JOIN api_keys ak ON ak.tenant_id = u.tenant_id AND ak.revoked = FALSE) AS users_with_keys,
            (SELECT COUNT(DISTINCT tenant_id) FROM events
                WHERE timestamp > NOW() - INTERVAL '7 days') AS tenants_active_7d
        """
    )
    return dict(row) if row else {}


@router.get("/managed/subscribers")
async def admin_managed_subscribers(
    search: str = "",
    status: str = "",
    _: dict = Depends(require_admin),
):
    """Users with an active subscription or trial (what marketing means by subscribed)."""
    pool = get_pool()
    clauses = ["u.subscription_status IS NOT NULL", "u.subscription_status != ''"]
    params: list[object] = []
    n = 1

    if status.strip():
        clauses.append(f"u.subscription_status = ${n}")
        params.append(status.strip())
        n += 1
    else:
        clauses.append("u.subscription_status IN ('trialing', 'active', 'past_due')")

    if search.strip():
        clauses.append(f"u.email ILIKE ${n}")
        params.append(f"%{search.strip()}%")
        n += 1

    where_sql = "WHERE " + " AND ".join(clauses)

    rows = await pool.fetch(
        f"""
        SELECT
            u.user_id, u.email, u.plan, u.subscription_status, u.trial_ends_at,
            u.created_at, u.last_login,
            t.tenant_id, t.name AS tenant_name,
            (SELECT COUNT(*) FROM api_keys
                WHERE tenant_id = t.tenant_id AND revoked = FALSE) AS active_keys,
            (SELECT COUNT(*) FROM events
                WHERE tenant_id = t.tenant_id
                  AND timestamp > NOW() - INTERVAL '7 days') AS events_7d
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
        {where_sql}
        ORDER BY u.created_at DESC
        LIMIT 500
        """,
        *params,
    )
    return [
        {
            "user_id":                str(r["user_id"]),
            "email":                  r["email"],
            "plan":                   r["plan"],
            "subscription_status":    r["subscription_status"],
            "trial_ends_at":          r["trial_ends_at"].isoformat() if r["trial_ends_at"] else None,
            "created_at":             r["created_at"].isoformat() if r["created_at"] else None,
            "last_login":             r["last_login"].isoformat() if r["last_login"] else None,
            "tenant_id":              str(r["tenant_id"]) if r["tenant_id"] else None,
            "tenant_name":            r["tenant_name"],
            "active_keys":            r["active_keys"],
            "events_7d":              r["events_7d"],
        }
        for r in rows
    ]


@router.get("/managed/users")
async def admin_managed_users(
    search: str = "",
    has_keys: bool | None = Query(default=None),
    active_7d: bool | None = Query(default=None),
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    clauses: list[str] = []
    params: list[object] = []
    n = 1

    if search.strip():
        clauses.append(f"u.email ILIKE ${n}")
        params.append(f"%{search.strip()}%")
        n += 1

    if has_keys is True:
        clauses.append(
            f"EXISTS (SELECT 1 FROM api_keys ak WHERE ak.tenant_id = t.tenant_id AND ak.revoked = FALSE)"
        )
    elif has_keys is False:
        clauses.append(
            "NOT EXISTS (SELECT 1 FROM api_keys ak WHERE ak.tenant_id = t.tenant_id AND ak.revoked = FALSE)"
        )

    if active_7d is True:
        clauses.append(
            f"""EXISTS (
                SELECT 1 FROM events e
                WHERE e.tenant_id = t.tenant_id
                  AND e.timestamp > NOW() - INTERVAL '7 days'
            )"""
        )
    elif active_7d is False:
        clauses.append(
            """NOT EXISTS (
                SELECT 1 FROM events e
                WHERE e.tenant_id = t.tenant_id
                  AND e.timestamp > NOW() - INTERVAL '7 days'
            )"""
        )

    where_sql = ("WHERE " + " AND ".join(clauses)) if clauses else ""

    rows = await pool.fetch(
        f"""
        SELECT
            u.user_id, u.email, u.plan, u.subscription_status, u.trial_ends_at,
            u.created_at, u.last_login,
            t.tenant_id, t.name AS tenant_name, t.created_at AS tenant_created_at,
            (SELECT COUNT(*) FROM api_keys
                WHERE tenant_id = t.tenant_id AND revoked = FALSE) AS active_keys,
            (SELECT COUNT(*) FROM agents WHERE tenant_id = t.tenant_id) AS agent_count,
            (SELECT COUNT(*) FROM events WHERE tenant_id = t.tenant_id) AS total_events,
            (SELECT COUNT(*) FROM events
                WHERE tenant_id = t.tenant_id
                  AND timestamp > NOW() - INTERVAL '7 days') AS events_7d,
            (SELECT MAX(timestamp) FROM events WHERE tenant_id = t.tenant_id) AS last_event,
            (
                SELECT COALESCE(
                    json_agg(
                        json_build_object(
                            'name', ak.name,
                            'prefix', ak.key_prefix,
                            'created_at', ak.created_at,
                            'last_used', ak.last_used
                        )
                        ORDER BY ak.created_at DESC
                    ),
                    '[]'::json
                )
                FROM api_keys ak
                WHERE ak.tenant_id = t.tenant_id AND ak.revoked = FALSE
            ) AS api_keys
        FROM users u
        LEFT JOIN tenants t ON u.tenant_id = t.tenant_id
        {where_sql}
        ORDER BY u.created_at DESC
        LIMIT 500
        """,
        *params,
    )
    return [
        {
            "user_id":           str(r["user_id"]),
            "email":             r["email"],
            "tenant_id":         str(r["tenant_id"]) if r["tenant_id"] else None,
            "tenant_name":       r["tenant_name"],
            "tenant_created_at": r["tenant_created_at"].isoformat() if r["tenant_created_at"] else None,
            "created_at":        r["created_at"].isoformat() if r["created_at"] else None,
            "last_login":        r["last_login"].isoformat() if r["last_login"] else None,
            "active_keys":       r["active_keys"],
            "agent_count":       r["agent_count"],
            "total_events":      r["total_events"],
            "events_7d":         r["events_7d"],
            "last_event":        r["last_event"].isoformat() if r["last_event"] else None,
            "api_keys":          r["api_keys"] if isinstance(r["api_keys"], list) else [],
            "customer_status":   (
                "active" if r["events_7d"] and r["events_7d"] > 0
                else "signed_up" if r["active_keys"] and r["active_keys"] > 0
                else "registered"
            ),
            "plan":              r["plan"],
            "subscription_status": r["subscription_status"],
            "trial_ends_at":     r["trial_ends_at"].isoformat() if r["trial_ends_at"] else None,
        }
        for r in rows
    ]


@router.get("/managed/usage")
async def admin_managed_usage(_: dict = Depends(require_admin)):
    pool = get_pool()

    daily = await pool.fetch(
        """
        SELECT DATE(timestamp) AS day,
               COUNT(*)::bigint AS events,
               COUNT(DISTINCT tenant_id) AS tenants_active
        FROM events
        WHERE timestamp > NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day
        """
    )

    top_tenants = await pool.fetch(
        """
        SELECT
            t.tenant_id, t.name,
            (SELECT email FROM users WHERE tenant_id = t.tenant_id LIMIT 1) AS owner,
            COUNT(e.event_id)::bigint AS events_7d
        FROM tenants t
        LEFT JOIN events e
          ON e.tenant_id = t.tenant_id
         AND e.timestamp > NOW() - INTERVAL '7 days'
        GROUP BY t.tenant_id, t.name
        ORDER BY events_7d DESC
        LIMIT 20
        """
    )

    return {
        "daily": [
            {
                "day":            r["day"].isoformat(),
                "events":         r["events"],
                "tenants_active": r["tenants_active"],
            } for r in daily
        ],
        "top_tenants_7d": [
            {
                "tenant_id": str(r["tenant_id"]),
                "name":      r["name"],
                "owner":     r["owner"],
                "events_7d": r["events_7d"],
            } for r in top_tenants
        ],
    }


@router.get("/demo-requests")
async def admin_demo_requests(
    search: str = "",
    limit: int = Query(100, ge=1, le=500),
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    params: list = []
    where = "WHERE TRUE"

    if search.strip():
        params.append(f"%{search.strip()}%")
        n = len(params)
        where += f"""
            AND (
                first_name ILIKE ${n}
                OR last_name ILIKE ${n}
                OR company_name ILIKE ${n}
                OR website ILIKE ${n}
                OR email ILIKE ${n}
                OR COALESCE(position, '') ILIKE ${n}
                OR COALESCE(source, '') ILIKE ${n}
            )
        """

    params.append(limit)
    limit_idx = len(params)

    rows = await pool.fetch(
        f"""
        SELECT request_id, first_name, last_name, email, company_name, website, position, source, ip_address, created_at
        FROM demo_requests
        {where}
        ORDER BY created_at DESC
        LIMIT ${limit_idx}
        """,
        *params,
    )

    return [
        {
            "request_id":   str(r["request_id"]),
            "first_name":   r["first_name"],
            "last_name":    r["last_name"],
            "email":        r["email"],
            "company_name": r["company_name"],
            "website":      r["website"],
            "position":     r["position"],
            "source":       r["source"],
            "ip_address":   r["ip_address"],
            "created_at":   r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


@router.get("/marketing-subscriptions")
async def admin_marketing_subscriptions(
    search: str = "",
    limit: int = Query(200, ge=1, le=500),
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    params: list = []
    where = "WHERE TRUE"

    if search.strip():
        params.append(f"%{search.strip()}%")
        n = len(params)
        where += f" AND email ILIKE ${n}"

    params.append(limit)
    limit_idx = len(params)

    rows = await pool.fetch(
        f"""
        SELECT subscription_id, email, source, ip_address, created_at
        FROM marketing_subscriptions
        {where}
        ORDER BY created_at DESC
        LIMIT ${limit_idx}
        """,
        *params,
    )

    return [
        {
            "subscription_id": str(r["subscription_id"]),
            "email": r["email"],
            "source": r["source"],
            "ip_address": r["ip_address"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]
