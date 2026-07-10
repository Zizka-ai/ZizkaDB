"""Public marketing event pings from db.zizka.ai landing page."""

from __future__ import annotations

import json
import logging
import time
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from db.connection import get_pool

router = APIRouter()
log = logging.getLogger(__name__)

_rate: dict[str, list[float]] = {}
RATE_WINDOW_SEC = 3600
RATE_MAX = 120


class MarketingEventBody(BaseModel):
    visitor_id: str = Field(min_length=8, max_length=128)
    session_id: str | None = Field(default=None, max_length=128)
    event_type: str = Field(min_length=1, max_length=64)
    segment: str | None = Field(default=None, max_length=32)
    page_path: str | None = Field(default=None, max_length=512)
    payload: dict[str, Any] = Field(default_factory=dict)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate(ip: str) -> None:
    now = time.time()
    hits = [t for t in _rate.get(ip, []) if now - t < RATE_WINDOW_SEC]
    if len(hits) >= RATE_MAX:
        raise HTTPException(status_code=429, detail="Too many requests")
    hits.append(now)
    _rate[ip] = hits


@router.post("", status_code=201)
async def create_marketing_event(body: MarketingEventBody, request: Request):
    ip = _client_ip(request)
    _check_rate(ip)

    pool = get_pool()
    await pool.execute(
        """
        INSERT INTO marketing_events
            (visitor_id, session_id, event_type, segment, page_path, payload, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        """,
        body.visitor_id[:128],
        (body.session_id or "")[:128] or None,
        body.event_type[:64],
        (body.segment or "")[:32] or None,
        (body.page_path or "")[:512] or None,
        json.dumps(body.payload or {}),
        ip[:64],
    )
    return {"ok": True}
