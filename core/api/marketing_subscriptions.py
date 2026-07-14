"""
Public marketing subscription endpoint (popup lead capture).

- Must not gate access: banner/popup are UX-only; this endpoint is optional.
- Stores emails for the admin panel under "Marketing Material Subscriptions".
"""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from db.connection import get_pool

router = APIRouter()
log = logging.getLogger(__name__)

_rate: dict[str, list[float]] = {}
RATE_WINDOW_SEC = 3600
RATE_MAX = 20


class SubscribeBody(BaseModel):
    email: EmailStr
    source: str = Field(default="popup", max_length=64)
    botcheck: str | None = None  # honeypot


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> None:
    now = time.time()
    hits = [t for t in _rate.get(ip, []) if now - t < RATE_WINDOW_SEC]
    if len(hits) >= RATE_MAX:
        raise HTTPException(status_code=429, detail="Too many requests. Try again later.")
    hits.append(now)
    _rate[ip] = hits


@router.post("", status_code=201)
async def subscribe(body: SubscribeBody, request: Request):
    if body.botcheck:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = _client_ip(request)
    _check_rate(ip)

    pool = get_pool()
    email = str(body.email).strip().lower()
    source = (body.source.strip() or "popup")[:64]
    ua = (request.headers.get("user-agent") or "")[:2000]

    # Upsert on lower(email) via unique index; do not error on re-subscribe.
    await pool.execute(
        """
        INSERT INTO marketing_subscriptions (email, source, ip_address, user_agent)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (LOWER(email)) DO UPDATE
          SET source = EXCLUDED.source,
              ip_address = EXCLUDED.ip_address,
              user_agent = EXCLUDED.user_agent,
              created_at = NOW()
        """,
        email,
        source,
        ip,
        ua,
    )

    log.info("marketing subscription: %s (%s)", email, source)
    return {"ok": True}

