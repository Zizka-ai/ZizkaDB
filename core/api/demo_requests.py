"""
Public demo request form — landing page "Book demo" submissions.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field
from db.connection import get_pool
from services.rate_limiter import RateLimiter, InMemoryStorage, SlidingWindowStrategy

router = APIRouter()
log = logging.getLogger(__name__)


RATE_WINDOW_SEC = 3600
RATE_MAX = 8

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
    botcheck: str | None = None  # honeypot — must be empty


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("", status_code=201)
async def create_demo_request(body: CreateDemoRequestBody, request: Request):
    if body.botcheck:
        raise HTTPException(status_code=400, detail="Invalid submission")

    ip = _client_ip(request)
    await demo_limiter.check(ip)

    pool = get_pool()
    row = await pool.fetchrow(
        """
        INSERT INTO demo_requests (first_name, last_name, email, company_name, website, ip_address)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING request_id, created_at
        """,
        body.first_name.strip(),
        body.last_name.strip(),
        str(body.email).strip().lower(),
        body.company_name.strip(),
        body.website.strip(),
        ip,
    )
    log.info("demo request from %s (%s %s)", ip, body.first_name, body.company_name)
    return {
        "id": str(row["request_id"]),
        "created_at": row["created_at"].isoformat(),
    }
