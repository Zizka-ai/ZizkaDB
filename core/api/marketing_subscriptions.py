"""
Public marketing subscription endpoint (popup lead capture).

- Must not gate access: banner/popup are UX-only; this endpoint is optional.
- Stores emails for the admin panel under "Marketing Material Subscriptions".
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from api.utils import client_ip
from db.connection import get_pool
from services.email_suppress import is_suppressed
from services.rate_limiter import RateLimiter, RedisStorage, SlidingWindowStrategy

router = APIRouter()
log = logging.getLogger(__name__)

RATE_WINDOW_SEC = 3600
RATE_MAX = 20

subscribe_limiter = RateLimiter(
    limit=RATE_MAX,
    window_sec=RATE_WINDOW_SEC,
    storage=RedisStorage(key_prefix="ratelimit:marketing-subscribe"),
    strategy=SlidingWindowStrategy(),
    detail="Too many requests. Try again later.",
)


class SubscribeBody(BaseModel):
    email: EmailStr
    source: str = Field(default="popup", max_length=64)
    botcheck: str | None = None  # honeypot




@router.post("", status_code=201)
async def subscribe(body: SubscribeBody, request: Request):
    if body.botcheck:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = client_ip(request)
    await subscribe_limiter.check(ip)

    pool = get_pool()
    email = str(body.email).strip().lower()
    if await is_suppressed(pool, email):
        # Soft success — do not re-add unsubscribed addresses
        return {"ok": True, "suppressed": True}

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

