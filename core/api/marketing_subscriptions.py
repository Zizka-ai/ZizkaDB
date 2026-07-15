"""
Public marketing subscription endpoint (popup lead capture).

- Must not gate access: banner/popup are UX-only; this endpoint is optional.
- Stores emails for the admin panel under "Marketing Material Subscriptions".
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from api.utils import check_rate, client_ip
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




@router.post("", status_code=201)
async def subscribe(body: SubscribeBody, request: Request):
    if body.botcheck:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = client_ip(request)
    check_rate(_rate, ip, RATE_WINDOW_SEC, RATE_MAX)

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

