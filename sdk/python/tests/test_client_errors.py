"""Tests for the SDK's 'wrong API key' error message (issue #85, item 1).

On a 401 the SDK used to always tell the user to "go to db.zizka.ai/dashboard",
which is wrong for a self-hoster whose keys live on their own instance. These
tests pin the host-aware behaviour and that the server's guidance is surfaced.
"""

import httpx
import pytest

from zizkadb.client import ZizkaDB, CLOUD_HOST
from zizkadb.exceptions import AuthError


def _resp(status_code: int, detail: str | None = None) -> httpx.Response:
    body = {"detail": detail} if detail is not None else {}
    return httpx.Response(status_code=status_code, json=body)


def test_cloud_401_points_to_cloud_dashboard():
    db = ZizkaDB(api_key="zizkadb_live_bad")  # defaults to cloud host
    assert db._base_url == CLOUD_HOST

    with pytest.raises(AuthError) as exc_info:
        db._handle(_resp(401))

    msg = str(exc_info.value)
    assert "db.zizka.ai/dashboard" in msg
    assert exc_info.value.status_code == 401


def test_selfhost_401_points_to_own_instance_not_cloud():
    db = ZizkaDB(host="http://localhost:8000")

    with pytest.raises(AuthError) as exc_info:
        db._handle(_resp(401))

    msg = str(exc_info.value)
    # Names the instance the caller actually hit...
    assert "http://localhost:8000" in msg
    # ...and must NOT send a self-hoster to the cloud dashboard.
    assert "db.zizka.ai/dashboard" not in msg


def test_401_ignores_non_string_server_detail():
    """FastAPI sends a list for validation errors — must not blow up on it."""
    db = ZizkaDB(host="http://localhost:8000")
    resp = httpx.Response(status_code=401, json={"detail": [{"msg": "bad"}]})

    with pytest.raises(AuthError) as exc_info:
        db._handle(resp)

    assert "Server:" not in str(exc_info.value)
    assert "http://localhost:8000" in str(exc_info.value)


def test_401_surfaces_server_detail():
    db = ZizkaDB(host="http://localhost:8000")

    with pytest.raises(AuthError) as exc_info:
        db._handle(_resp(401, detail="Send it as 'Authorization: Bearer <api-key>'."))

    assert "Server:" in str(exc_info.value)
    assert "Authorization: Bearer" in str(exc_info.value)
