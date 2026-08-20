"""Unit tests for GET /health/deep."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("main.check_postgres", new_callable=AsyncMock, return_value={"ok": True})
@patch("main.check_redis", new_callable=AsyncMock, return_value={"ok": True})
@patch("main.check_qdrant", new_callable=AsyncMock, return_value={"ok": True})
def test_deep_health_returns_dependency_status(_q, _r, _p):
    res = client.get("/health/deep")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert "checks" in body
    assert body["checks"]["postgres"]["ok"] is True
