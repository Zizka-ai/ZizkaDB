"""Tests for ZizkaDB._handle() error surfacing (Issue: wrong API key on self-host)."""

from __future__ import annotations

import httpx
import pytest

from zizkadb.client import ZizkaDB
from zizkadb.exceptions import AgentScopeError, AuthError, NotFoundError, RateLimitError


def _response(status_code: int, detail: str) -> httpx.Response:
    request = httpx.Request("POST", "http://testserver/v1/events")
    return httpx.Response(status_code, json={"detail": detail}, request=request)


def test_self_hosted_401_surfaces_server_detail_and_self_host_hint():
    """Before this fix, every 401 raised a hardcoded cloud-only message that
    discarded the server's actual detail and pointed self-hosters at a cloud
    dashboard they don't have."""
    db = ZizkaDB(host="http://localhost:8000", api_key="bad_key")

    with pytest.raises(AuthError) as exc:
        db._handle(_response(401, "Invalid or revoked API key"))

    message = str(exc.value)
    assert "Invalid or revoked API key" in message
    assert "localhost:8000" in message
    assert "db.zizka.ai/dashboard" not in message


def test_cloud_401_points_to_dashboard():
    db = ZizkaDB(api_key="zizkadb_live_bad")

    with pytest.raises(AuthError) as exc:
        db._handle(_response(401, "Invalid or revoked API key"))

    message = str(exc.value)
    assert "Invalid or revoked API key" in message
    assert "db.zizka.ai/dashboard" in message


def test_403_still_surfaces_agent_scope_detail():
    db = ZizkaDB(host="http://localhost:8000", api_key="scoped_key")

    with pytest.raises(AgentScopeError) as exc:
        db._handle(_response(403, "This API key is scoped to agent 'bot-a' only"))

    assert "bot-a" in str(exc.value)


def test_404_and_429_unchanged():
    db = ZizkaDB(host="http://localhost:8000", api_key="k")

    with pytest.raises(NotFoundError):
        db._handle(_response(404, "not found"))

    with pytest.raises(RateLimitError):
        db._handle(_response(429, "slow down"))
