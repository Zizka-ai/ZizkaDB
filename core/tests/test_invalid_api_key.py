"""Tests for the clear 'wrong API key' error on writes (issue #85, item 1).

A new integrator who hits a write with a bad key should get an actionable 401,
not a bare "Invalid API key". These tests pin the API-side message so it keeps
telling the caller how to fix it (header format, minting a key, the self-host
ENV=production dev-key gotcha).

No database or network required — `resolve_api_key_tenant` is patched so the
bad key never reaches the DB pool.
"""

from unittest.mock import AsyncMock, patch

import pytest
from fastapi import HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials

from api.deps import get_tenant, _INVALID_API_KEY_MESSAGE


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


@pytest.mark.asyncio
@patch("api.deps._dev_key_accepted", return_value=False)
@patch("api.deps.resolve_api_key_tenant", new_callable=AsyncMock)
async def test_bad_api_key_returns_actionable_401(mock_resolve, _mock_dev):
    """A non-JWT unknown key is rejected with the actionable message."""
    mock_resolve.return_value = None

    with pytest.raises(HTTPException) as exc_info:
        await get_tenant(_creds("zizkadb_live_totally_wrong_key"))

    exc = exc_info.value
    assert exc.status_code == status.HTTP_401_UNAUTHORIZED
    assert exc.detail == _INVALID_API_KEY_MESSAGE
    # Challenge header is set so HTTP clients recognise it as an auth failure.
    assert exc.headers.get("WWW-Authenticate") == "Bearer"


def test_message_is_actionable_for_new_integrator():
    """The message must tell the integrator to use a key for THIS deployment and
    distinguish cloud (dashboard) from self-hosted (instance-generated) keys —
    the thing that trips up a new integrator on a write with a bad key."""
    msg = _INVALID_API_KEY_MESSAGE.lower()
    assert "deployment" in msg
    assert "dashboard" in msg
    assert "self-hosted" in msg
