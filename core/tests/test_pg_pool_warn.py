"""Unit tests for Postgres pool sizing warnings (no live database)."""

from db.connection import uvicorn_worker_count, warn_if_pool_near_pg_limit


def test_warns_at_production_default_80_connections():
    msg = warn_if_pool_near_pg_limit(20, 4)
    assert msg is not None
    assert "80" in msg
    assert "PgBouncer" in msg


def test_silent_when_well_under_limit():
    assert warn_if_pool_near_pg_limit(5, 2) is None


def test_uvicorn_worker_count_reads_env(monkeypatch):
    monkeypatch.setenv("WEB_CONCURRENCY", "2")
    monkeypatch.delenv("UVICORN_WORKERS", raising=False)
    assert uvicorn_worker_count() == 2


def test_uvicorn_worker_count_defaults_to_compose_workers(monkeypatch):
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    monkeypatch.delenv("UVICORN_WORKERS", raising=False)
    assert uvicorn_worker_count() == 4
