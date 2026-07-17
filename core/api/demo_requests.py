"""
Public demo request form — landing page "Book demo" submissions.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Request, status
from services.exceptions import make_exception, bad_request
from pydantic import BaseModel, EmailStr, Field

from api.utils import client_ip
from db.connection import get_pool
from services.rate_limiter import RateLimiter, InMemoryStorage, SlidingWindowStrategy

router = APIRouter()
log = logging.getLogger(__name__)


RATE_WINDOW_SEC = 3600
RATE_MAX = 8
VALID_SOURCES = frozenset({"enterprise", "landing", "newsletter"})

demo_limiter = RateLimiter(
    limit=RATE_MAX,
    window_sec=RATE_WINDOW_SEC,
    storage=InMemoryStorage(),
    strategy=SlidingWindowStrategy(),
    detail="Too many requests. Try again later."
)


class CreateDemoRequestBody(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    company_name: str = Field(min_length=1, max_length=255)
    website: str = Field(min_length=1, max_length=500)
    position: str | None = Field(default=None, max_length=120)
    source: str | None = Field(default=None, max_length=64)
    botcheck: str | None = None  # honeypot — must be empty





@router.post("", status_code=201)
async def create_demo_request(body: CreateDemoRequestBody, request: Request):
    if body.botcheck:
        raise bad_request("Invalid submission")

    ip = client_ip(request)
    await demo_limiter.check(ip)

    source = (body.source.strip() or None) if body.source else None
    if source and source not in VALID_SOURCES:
        raise make_exception(status.HTTP_422_UNPROCESSABLE_ENTITY, "Invalid source")

    pool = get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO demo_requests (first_name, last_name, email, company_name, website, position, source, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING request_id, created_at
        """,
        body.first_name.strip(),
        body.last_name.strip(),
        str(body.email).strip().lower(),
        body.company_name.strip(),
        body.website.strip(),
        (body.position.strip() or None) if body.position else None,
        source,
        ip,
    )
    log.info("demo request from %s (%s %s)", ip, body.first_name, body.company_name)
    return {
        "id": str(row["request_id"]),
        "created_at": row["created_at"].isoformat(),
    }
