"""
Admin Developer Leads — GitHub public-email discovery.

Manual "Find today's leads" only. Cap 100 new leads/day.
Dedupes against existing leads and past outreach sends.
"""

from __future__ import annotations

import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from api.admin import require_admin
from db.connection import get_pool
from services.github_leads import (
    DAILY_LEAD_LIMIT,
    DEFAULT_KEYWORDS,
    find_public_leads,
    github_token,
    parse_keywords,
)
from services.leads_countries import countries_for_api

log = logging.getLogger(__name__)

admin_router = APIRouter()


class FindLeadsRequest(BaseModel):
    keywords: str = Field(DEFAULT_KEYWORDS, max_length=500)
    country_code: str = Field("WW", max_length=8)


class LeadStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(new|approved|rejected|contacted)$")


async def _imported_today(pool) -> int:
    return int(
        await pool.fetchval(
            """
            SELECT COUNT(*)::int FROM developer_leads
            WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
            """
        )
        or 0
    )


async def _exclude_sets(pool) -> tuple[set[str], set[str]]:
    emails = await pool.fetch(
        """
        SELECT LOWER(email) AS email FROM developer_leads
        UNION
        SELECT LOWER(to_email) FROM email_outreach_sends
        """
    )
    users = await pool.fetch(
        "SELECT LOWER(github_username) AS u FROM developer_leads WHERE github_username IS NOT NULL"
    )
    return (
        {r["email"] for r in emails if r["email"]},
        {r["u"] for r in users if r["u"]},
    )


@admin_router.get("/leads/countries")
async def leads_countries(_: dict = Depends(require_admin)):
    return countries_for_api()


@admin_router.get("/leads/stats")
async def leads_stats(_: dict = Depends(require_admin)):
    pool = get_pool()
    imported_today = await _imported_today(pool)
    row = await pool.fetchrow(
        """
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'new')::int AS status_new,
          COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected,
          COUNT(*) FILTER (WHERE status = 'contacted')::int AS contacted
        FROM developer_leads
        """
    )
    return {
        "imported_today": imported_today,
        "daily_limit": DAILY_LEAD_LIMIT,
        "remaining_today": max(0, DAILY_LEAD_LIMIT - imported_today),
        "total": row["total"] or 0,
        "status_new": row["status_new"] or 0,
        "approved": row["approved"] or 0,
        "rejected": row["rejected"] or 0,
        "contacted": row["contacted"] or 0,
        "token_configured": bool(github_token()),
        "default_keywords": DEFAULT_KEYWORDS,
    }


@admin_router.get("/leads")
async def list_leads(
    status: str = "",
    search: str = "",
    limit: int = Query(100, ge=1, le=300),
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    params: list = []
    where = "WHERE TRUE"
    if status.strip():
        params.append(status.strip())
        where += f" AND status = ${len(params)}"
    if search.strip():
        params.append(f"%{search.strip()}%")
        n = len(params)
        where += f"""
            AND (
                email ILIKE ${n}
                OR github_username ILIKE ${n}
                OR COALESCE(name, '') ILIKE ${n}
                OR COALESCE(location, '') ILIKE ${n}
                OR COALESCE(match_reason, '') ILIKE ${n}
            )
        """
    params.append(limit)
    rows = await pool.fetch(
        f"""
        SELECT lead_id, email, name, github_username, profile_url, bio, location,
               country_code, matched_keyword, matched_repo, signal, match_reason,
               status, created_at
        FROM developer_leads
        {where}
        ORDER BY created_at DESC
        LIMIT ${len(params)}
        """,
        *params,
    )
    return [
        {
            "lead_id": str(r["lead_id"]),
            "email": r["email"],
            "name": r["name"],
            "github_username": r["github_username"],
            "profile_url": r["profile_url"],
            "bio": r["bio"],
            "location": r["location"],
            "country_code": r["country_code"],
            "matched_keyword": r["matched_keyword"],
            "matched_repo": r["matched_repo"],
            "signal": r["signal"],
            "match_reason": r["match_reason"],
            "status": r["status"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


@admin_router.post("/leads/find")
async def find_leads(body: FindLeadsRequest, _: dict = Depends(require_admin)):
    pool = get_pool()
    imported_today = await _imported_today(pool)
    remaining = max(0, DAILY_LEAD_LIMIT - imported_today)
    if remaining <= 0:
        raise HTTPException(
            status_code=429,
            detail=f"Daily lead import limit reached ({DAILY_LEAD_LIMIT}/day).",
        )

    keywords = parse_keywords(body.keywords)
    country = (body.country_code or "WW").upper().strip()
    exclude_emails, exclude_users = await _exclude_sets(pool)

    run_id = uuid.uuid4()
    await pool.execute(
        """
        INSERT INTO developer_lead_runs (
            run_id, keywords, country_code, status, started_at
        ) VALUES ($1, $2, $3, 'running', NOW())
        """,
        run_id,
        ",".join(keywords),
        country,
    )

    try:
        candidates, meta = await find_public_leads(
            keywords=keywords,
            country_code=country,
            exclude_emails=exclude_emails,
            exclude_usernames=exclude_users,
            limit=remaining,
        )
    except RuntimeError as exc:
        await pool.execute(
            """
            UPDATE developer_lead_runs
            SET status = 'failed', error = $2, finished_at = NOW()
            WHERE run_id = $1
            """,
            run_id,
            str(exc)[:500],
        )
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        log.exception("leads find failed")
        await pool.execute(
            """
            UPDATE developer_lead_runs
            SET status = 'failed', error = $2, finished_at = NOW()
            WHERE run_id = $1
            """,
            run_id,
            str(exc)[:500],
        )
        raise HTTPException(status_code=500, detail=f"Lead search failed: {exc}") from exc

    inserted = 0
    for c in candidates:
        try:
            row = await pool.fetchrow(
                """
                INSERT INTO developer_leads (
                    lead_id, email, name, github_username, profile_url, bio, location,
                    country_code, matched_keyword, matched_repo, signal, match_reason,
                    status, run_id
                ) VALUES (
                    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'new',$13
                )
                ON CONFLICT ((LOWER(email))) DO NOTHING
                RETURNING lead_id
                """,
                uuid.uuid4(),
                c.email,
                c.name,
                c.github_username,
                c.profile_url,
                c.bio,
                c.location,
                country,
                c.matched_keyword,
                c.matched_repo,
                c.signal,
                c.match_reason,
                run_id,
            )
            if row:
                inserted += 1
        except Exception:
            log.exception("failed inserting lead %s", c.email)

    await pool.execute(
        """
        UPDATE developer_lead_runs
        SET status = 'done',
            found_count = $2,
            inserted_count = $3,
            meta = $4::jsonb,
            finished_at = NOW()
        WHERE run_id = $1
        """,
        run_id,
        len(candidates),
        inserted,
        json.dumps(meta),
    )

    return {
        "run_id": str(run_id),
        "found": len(candidates),
        "inserted": inserted,
        "remaining_today": max(0, remaining - inserted),
        "meta": meta,
    }


@admin_router.patch("/leads/{lead_id}")
async def update_lead_status(
    lead_id: str,
    body: LeadStatusUpdate,
    _: dict = Depends(require_admin),
):
    try:
        lid = uuid.UUID(lead_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="Not found") from exc

    pool = get_pool()
    row = await pool.fetchrow(
        """
        UPDATE developer_leads
        SET status = $2, updated_at = NOW()
        WHERE lead_id = $1
        RETURNING lead_id, email, name, status
        """,
        lid,
        body.status,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "lead_id": str(row["lead_id"]),
        "email": row["email"],
        "name": row["name"],
        "status": row["status"],
    }
