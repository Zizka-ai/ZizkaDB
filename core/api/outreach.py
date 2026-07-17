"""
Admin email outreach + public open-tracking pixel.

Compose personalized developer outreach from /admin (founder only).
Sends via existing SMTP (EMAIL_* → founder@zizka.ai). Caps at 100 sends/day.
Records opens via a 1×1 tracking GIF at /v1/outreach/o/{send_id}.gif.
"""

from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field

from api.admin import require_admin
from db.connection import get_pool
from services.email import send_email, smtp_configured
from services.outreach_template import build_outreach_html, build_outreach_text

log = logging.getLogger(__name__)

admin_router = APIRouter()
public_router = APIRouter()

DAILY_SEND_LIMIT = int(os.getenv("OUTREACH_DAILY_LIMIT", "100"))
GITHUB_DEFAULT = "https://github.com/Zizka-ai/ZizkaDB"
DISCORD_DEFAULT = "https://discord.gg/EBjAABKkh"
DISCORD_LABEL_DEFAULT = "Join our Discord community"

# 1×1 transparent GIF
_PIXEL_GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04"
    b"\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def _public_api_base() -> str:
    return os.getenv("PUBLIC_API_URL", "http://localhost:8000").rstrip("/")


class OutreachSendRequest(BaseModel):
    to_email: EmailStr
    subject: str = Field(..., min_length=1, max_length=200)
    recipient_name: str = Field("", max_length=120)
    body: str = Field(..., min_length=1, max_length=20_000)
    image_url: Optional[str] = Field(None, max_length=2000)
    image_caption: Optional[str] = Field(None, max_length=300)
    cta_label: Optional[str] = Field("Star on GitHub", max_length=80)
    cta_url: Optional[str] = Field(GITHUB_DEFAULT, max_length=500)
    discord_cta_label: Optional[str] = Field(DISCORD_LABEL_DEFAULT, max_length=80)
    discord_cta_url: Optional[str] = Field(DISCORD_DEFAULT, max_length=500)
    github_url: str = Field(GITHUB_DEFAULT, max_length=500)
    sign_off: str = Field(
        "Best,\nFellow Developer,\nMir",
        max_length=500,
    )


class OutreachPreviewRequest(BaseModel):
    recipient_name: str = Field("", max_length=120)
    body: str = Field(..., min_length=1, max_length=20_000)
    image_url: Optional[str] = Field(None, max_length=2000)
    image_caption: Optional[str] = Field(None, max_length=300)
    cta_label: Optional[str] = Field("Star on GitHub", max_length=80)
    cta_url: Optional[str] = Field(GITHUB_DEFAULT, max_length=500)
    discord_cta_label: Optional[str] = Field(DISCORD_LABEL_DEFAULT, max_length=80)
    discord_cta_url: Optional[str] = Field(DISCORD_DEFAULT, max_length=500)
    github_url: str = Field(GITHUB_DEFAULT, max_length=500)
    sign_off: str = Field(
        "Best,\nFellow Developer,\nMir",
        max_length=500,
    )


async def _sent_today_count(pool) -> int:
    return int(
        await pool.fetchval(
            """
            SELECT COUNT(*)::int FROM email_outreach_sends
            WHERE status = 'sent'
              AND sent_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
            """
        )
        or 0
    )


@admin_router.get("/outreach/stats")
async def outreach_stats(_: dict = Depends(require_admin)):
    pool = get_pool()
    sent_today = await _sent_today_count(pool)
    row = await pool.fetchrow(
        """
        SELECT
          COUNT(*) FILTER (WHERE status = 'sent')::int AS total_sent,
          COUNT(*) FILTER (WHERE status = 'sent' AND open_count > 0)::int AS total_opened,
          COUNT(*) FILTER (WHERE status = 'failed')::int AS total_failed
        FROM email_outreach_sends
        """
    )
    total_sent = row["total_sent"] or 0
    total_opened = row["total_opened"] or 0
    open_rate = round((total_opened / total_sent) * 100, 1) if total_sent else 0.0
    return {
        "sent_today": sent_today,
        "daily_limit": DAILY_SEND_LIMIT,
        "remaining_today": max(0, DAILY_SEND_LIMIT - sent_today),
        "total_sent": total_sent,
        "total_opened": total_opened,
        "total_failed": row["total_failed"] or 0,
        "open_rate_pct": open_rate,
        "smtp_configured": smtp_configured(),
        "from_address": os.getenv("EMAIL_FROM", "ZizkaDB <founder@zizka.ai>"),
    }


@admin_router.get("/outreach/sends")
async def outreach_sends(
    limit: int = Query(50, ge=1, le=200),
    _: dict = Depends(require_admin),
):
    pool = get_pool()
    rows = await pool.fetch(
        """
        SELECT send_id, to_email, subject, status, error, open_count, opened_at, sent_at, created_at,
               image_url, recipient_name
        FROM email_outreach_sends
        ORDER BY created_at DESC
        LIMIT $1
        """,
        limit,
    )
    return [
        {
            "send_id": str(r["send_id"]),
            "to_email": r["to_email"],
            "subject": r["subject"],
            "recipient_name": r["recipient_name"],
            "status": r["status"],
            "error": r["error"],
            "open_count": r["open_count"],
            "opened_at": r["opened_at"].isoformat() if r["opened_at"] else None,
            "sent_at": r["sent_at"].isoformat() if r["sent_at"] else None,
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "image_url": r["image_url"],
        }
        for r in rows
    ]


@admin_router.post("/outreach/preview")
async def outreach_preview(body: OutreachPreviewRequest, _: dict = Depends(require_admin)):
    pixel_url = f"{_public_api_base()}/v1/outreach/o/preview.gif"
    html_body = build_outreach_html(
        recipient_name=body.recipient_name,
        body=body.body,
        image_url=body.image_url,
        image_caption=body.image_caption,
        cta_label=body.cta_label,
        cta_url=body.cta_url,
        discord_cta_label=body.discord_cta_label,
        discord_cta_url=body.discord_cta_url,
        github_url=body.github_url,
        pixel_url=pixel_url,
        sign_off=body.sign_off,
    )
    text_body = build_outreach_text(
        recipient_name=body.recipient_name,
        body=body.body,
        image_url=body.image_url,
        cta_label=body.cta_label,
        cta_url=body.cta_url,
        discord_cta_label=body.discord_cta_label,
        discord_cta_url=body.discord_cta_url,
        github_url=body.github_url,
        sign_off=body.sign_off,
    )
    return {"html": html_body, "text": text_body}


@admin_router.post("/outreach/send")
async def outreach_send(body: OutreachSendRequest, _: dict = Depends(require_admin)):
    pool = get_pool()
    sent_today = await _sent_today_count(pool)
    if sent_today >= DAILY_SEND_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Daily outreach limit reached ({DAILY_SEND_LIMIT}/day). Try again tomorrow.",
        )

    send_id = uuid.uuid4()
    pixel_url = f"{_public_api_base()}/v1/outreach/o/{send_id}.gif"
    html_body = build_outreach_html(
        recipient_name=body.recipient_name,
        body=body.body,
        image_url=body.image_url,
        image_caption=body.image_caption,
        cta_label=body.cta_label,
        cta_url=body.cta_url,
        discord_cta_label=body.discord_cta_label,
        discord_cta_url=body.discord_cta_url,
        github_url=body.github_url,
        pixel_url=pixel_url,
        sign_off=body.sign_off,
    )
    text_body = build_outreach_text(
        recipient_name=body.recipient_name,
        body=body.body,
        image_url=body.image_url,
        cta_label=body.cta_label,
        cta_url=body.cta_url,
        discord_cta_label=body.discord_cta_label,
        discord_cta_url=body.discord_cta_url,
        github_url=body.github_url,
        sign_off=body.sign_off,
    )

    await pool.execute(
        """
        INSERT INTO email_outreach_sends (
            send_id, to_email, subject, recipient_name, body_text, html_body,
            image_url, image_caption, cta_label, cta_url,
            discord_cta_label, discord_cta_url, github_url, sign_off, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'queued')
        """,
        send_id,
        body.to_email.lower().strip(),
        body.subject.strip(),
        body.recipient_name.strip() or None,
        body.body,
        html_body,
        (body.image_url or "").strip() or None,
        (body.image_caption or "").strip() or None,
        (body.cta_label or "").strip() or None,
        (body.cta_url or "").strip() or None,
        (body.discord_cta_label or "").strip() or None,
        (body.discord_cta_url or "").strip() or None,
        body.github_url.strip(),
        body.sign_off.strip(),
    )

    try:
        await send_email(
            to_email=body.to_email.lower().strip(),
            subject=body.subject.strip(),
            text_body=text_body,
            html_body=html_body,
            reply_to=os.getenv("EMAIL_USER") or "founder@zizka.ai",
        )
    except Exception as exc:
        log.exception("outreach send failed send_id=%s", send_id)
        await pool.execute(
            """
            UPDATE email_outreach_sends
            SET status = 'failed', error = $2
            WHERE send_id = $1
            """,
            send_id,
            str(exc)[:500],
        )
        raise HTTPException(status_code=500, detail=f"Failed to send email: {exc}") from exc

    now = datetime.now(timezone.utc)
    await pool.execute(
        """
        UPDATE email_outreach_sends
        SET status = 'sent', sent_at = $2, error = NULL
        WHERE send_id = $1
        """,
        send_id,
        now,
    )

    return {
        "send_id": str(send_id),
        "status": "sent",
        "to_email": body.to_email.lower().strip(),
        "sent_today": sent_today + 1,
        "remaining_today": max(0, DAILY_SEND_LIMIT - (sent_today + 1)),
        "dev_fallback": not smtp_configured(),
    }


@public_router.get("/o/{send_id}.gif")
async def outreach_open_pixel(send_id: str, request: Request):
    """1×1 GIF open tracker. Always returns the pixel; never leaks existence."""
    try:
        sid = uuid.UUID(send_id)
    except ValueError:
        return Response(content=_PIXEL_GIF, media_type="image/gif")

    pool = get_pool()
    ip = request.client.host if request.client else None
    ua = (request.headers.get("user-agent") or "")[:500]

    try:
        row = await pool.fetchrow(
            "SELECT send_id, status FROM email_outreach_sends WHERE send_id = $1",
            sid,
        )
        if row and row["status"] == "sent":
            await pool.execute(
                """
                INSERT INTO email_outreach_opens (open_id, send_id, ip_address, user_agent)
                VALUES ($1, $2, $3, $4)
                """,
                uuid.uuid4(),
                sid,
                ip,
                ua or None,
            )
            await pool.execute(
                """
                UPDATE email_outreach_sends
                SET open_count = open_count + 1,
                    opened_at = COALESCE(opened_at, NOW())
                WHERE send_id = $1
                """,
                sid,
            )
    except Exception:
        log.exception("outreach open pixel failed send_id=%s", send_id)

    return Response(
        content=_PIXEL_GIF,
        media_type="image/gif",
        headers={
            "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
            "Pragma": "no-cache",
        },
    )
