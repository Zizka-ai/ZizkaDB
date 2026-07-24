"""Unit tests for /health and /health/deep.

No live Postgres/Redis/Qdrant needed: main.check_postgres/check_redis/
check_qdrant are monkeypatched directly, and TestClient(app) (used without a
`with` block, matching test_rate_limiting.py) never runs the app lifespan, so
/health never touches a real dependency either.
"""

from unittest.mock import AsyncMock

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

OK = {"ok": True}


def test_health_shallow_is_always_ok_and_ignores_dependencies(monkeypatch):
    """Shallow /health is a liveness probe: it must stay 200 even if every
    dependency is down, and it must not call the dependency checks at all."""
    monkeypatch.setattr("main.check_postgres", AsyncMock(side_effect=RuntimeError("down")))
    monkeypatch.setattr("main.check_redis", AsyncMock(side_effect=RuntimeError("down")))
    monkeypatch.setattr("main.check_qdrant", AsyncMock(side_effect=RuntimeError("down")))

    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0"}


def test_health_deep_all_ok_returns_200(monkeypatch):
    monkeypatch.setattr("main.check_postgres", AsyncMock(return_value=OK))
    monkeypatch.setattr("main.check_redis", AsyncMock(return_value=OK))
    monkeypatch.setattr("main.check_qdrant", AsyncMock(return_value={"ok": True, "collections": []}))

    response = client.get("/health/deep")

    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["checks"]["postgres"]["ok"] is True


def test_health_deep_reports_503_and_names_failed_subsystem(monkeypatch):
    """A degraded backend must fail the HTTP status, not just the JSON body --
    orchestrators that gate on status code (not body) need this to detect it."""
    monkeypatch.setattr("main.check_postgres", AsyncMock(return_value=OK))
    monkeypatch.setattr(
        "main.check_redis",
        AsyncMock(return_value={"ok": False, "error": "Redis connection refused"}),
    )
    monkeypatch.setattr("main.check_qdrant", AsyncMock(return_value=OK))

    response = client.get("/health/deep")

    assert response.status_code == 503
    body = response.json()
    assert body["status"] == "degraded"
    assert body["checks"]["postgres"]["ok"] is True
    assert body["checks"]["redis"]["ok"] is False
    assert "Redis connection refused" in body["checks"]["redis"]["error"]
    assert body["checks"]["qdrant"]["ok"] is True
