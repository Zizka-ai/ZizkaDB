"""
Email mailing-list suppression (unsubscribe / admin remove).

Removes the address from marketing lists, outreach contacts, and developer leads,
and blocks future outreach/marketing until cleared by an admin.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import os
import uuid
from typing import Optional
from urllib.parse import urlencode

log = logging.getLogger(__name__)


def _unsub_secret() -> str:
    return (
        os.getenv("UNSUBSCRIBE_SECRET")
        or os.getenv("JWT_SECRET")
        or "dev-secret"
    ).strip()


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def unsubscribe_token(email: str) -> str:
    email_n = normalize_email(email)
    digest = hmac.new(
        _unsub_secret().encode("utf-8"),
        email_n.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()[:32]
    return digest


def verify_unsubscribe_token(email: str, token: str) -> bool:
    if not email or not token:
        return False
    expected = unsubscribe_token(email)
    return hmac.compare_digest(expected, (token or "").strip())


def build_unsubscribe_url(email: str, *, api_base: Optional[str] = None) -> str:
    base = (api_base or os.getenv("PUBLIC_API_URL", "http://localhost:8000")).rstrip("/")
    qs = urlencode({"email": normalize_email(email), "token": unsubscribe_token(email)})
    return f"{base}/v1/outreach/unsubscribe?{qs}"


async def is_suppressed(pool, email: str) -> bool:
    email_n = normalize_email(email)
    if not email_n:
        return False
    row = await pool.fetchval(
        "SELECT 1 FROM email_suppressions WHERE LOWER(email) = $1 LIMIT 1",
        email_n,
    )
    return bool(row)


async def lookup_mailing_presence(pool, email: str) -> dict:
    """Where this email appears across mailing-related tables."""
    email_n = normalize_email(email)
    marketing = await pool.fetch(
        """
        SELECT subscription_id, email, source, created_at
        FROM marketing_subscriptions WHERE LOWER(email) = $1
        """,
        email_n,
    )
    contacts = await pool.fetch(
        """
        SELECT contact_id, email, name, status, imported_at
        FROM outreach_contacts WHERE LOWER(email) = $1
        """,
        email_n,
    )
    leads = await pool.fetch(
        """
        SELECT lead_id, email, name, status, created_at
        FROM developer_leads WHERE LOWER(email) = $1
        """,
        email_n,
    )
    sends = await pool.fetch(
        """
        SELECT send_id, to_email, subject, status, sent_at, created_at
        FROM email_outreach_sends
        WHERE LOWER(to_email) = $1
        ORDER BY created_at DESC
        LIMIT 20
        """,
        email_n,
    )
    suppressed = await pool.fetchrow(
        """
        SELECT email, reason, source, created_at
        FROM email_suppressions WHERE LOWER(email) = $1
        """,
        email_n,
    )
    users = await pool.fetch(
        """
        SELECT user_id, email, marketing_consent, marketing_consent_at
        FROM users WHERE LOWER(email) = $1
        """,
        email_n,
    )
    return {
        "email": email_n,
        "suppressed": bool(suppressed),
        "suppression": (
            {
                "email": suppressed["email"],
                "reason": suppressed["reason"],
                "source": suppressed["source"],
                "created_at": suppressed["created_at"].isoformat()
                if suppressed["created_at"]
                else None,
            }
            if suppressed
            else None
        ),
        "marketing_subscriptions": [
            {
                "subscription_id": str(r["subscription_id"]),
                "email": r["email"],
                "source": r["source"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in marketing
        ],
        "outreach_contacts": [
            {
                "contact_id": str(r["contact_id"]),
                "email": r["email"],
                "name": r["name"],
                "status": r["status"],
                "imported_at": r["imported_at"].isoformat() if r["imported_at"] else None,
            }
            for r in contacts
        ],
        "developer_leads": [
            {
                "lead_id": str(r["lead_id"]),
                "email": r["email"],
                "name": r["name"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in leads
        ],
        "outreach_sends": [
            {
                "send_id": str(r["send_id"]),
                "to_email": r["to_email"],
                "subject": r["subject"],
                "status": r["status"],
                "sent_at": r["sent_at"].isoformat() if r["sent_at"] else None,
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in sends
        ],
        "users": [
            {
                "user_id": str(r["user_id"]),
                "email": r["email"],
                "marketing_consent": bool(r["marketing_consent"]),
                "marketing_consent_at": r["marketing_consent_at"].isoformat()
                if r["marketing_consent_at"]
                else None,
            }
            for r in users
        ],
    }


async def remove_from_all_mailing_lists(
    pool,
    email: str,
    *,
    reason: str = "unsubscribed",
    source: str = "unsubscribe_link",
) -> dict:
    """
    Suppress email and remove from marketing / outreach contacts / developer leads.
    Does not delete paid user accounts; clears marketing_consent when present.
    Outreach send history is kept for audit but future sends are blocked.
    """
    email_n = normalize_email(email)
    if not email_n or "@" not in email_n:
        raise ValueError("Invalid email")

    deleted = {
        "marketing_subscriptions": 0,
        "outreach_contacts": 0,
        "developer_leads": 0,
        "users_marketing_cleared": 0,
    }

    r = await pool.execute(
        "DELETE FROM marketing_subscriptions WHERE LOWER(email) = $1",
        email_n,
    )
    deleted["marketing_subscriptions"] = int(str(r).split()[-1]) if r else 0

    r = await pool.execute(
        "DELETE FROM outreach_contacts WHERE LOWER(email) = $1",
        email_n,
    )
    deleted["outreach_contacts"] = int(str(r).split()[-1]) if r else 0

    r = await pool.execute(
        "DELETE FROM developer_leads WHERE LOWER(email) = $1",
        email_n,
    )
    deleted["developer_leads"] = int(str(r).split()[-1]) if r else 0

    r = await pool.execute(
        """
        UPDATE users
        SET marketing_consent = FALSE,
            marketing_consent_at = NULL
        WHERE LOWER(email) = $1 AND COALESCE(marketing_consent, FALSE) = TRUE
        """,
        email_n,
    )
    deleted["users_marketing_cleared"] = int(str(r).split()[-1]) if r else 0

    await pool.execute(
        """
        INSERT INTO email_suppressions (suppression_id, email, reason, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT ((LOWER(email))) DO UPDATE
        SET reason = EXCLUDED.reason,
            source = EXCLUDED.source,
            created_at = NOW()
        """,
        uuid.uuid4(),
        email_n,
        (reason or "unsubscribed")[:200],
        (source or "unsubscribe_link")[:64],
    )

    log.info("email suppressed email=%s source=%s deleted=%s", email_n, source, deleted)
    return {"email": email_n, "suppressed": True, "removed": deleted}
