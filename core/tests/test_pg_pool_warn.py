"""Unit tests for Postgres pool sizing warnings (no live database)."""

from db.connection import uvicorn_worker_count, warn_if_pool_near_pg_limit


def test_warns_at_production_default_80_connections():
    msg = warn_if_pool_near_pg_limit(20, 4)
    assert msg is not None
    assert "80" in msg
    assert "PgBouncer" in msg
    assert "assumed" not in msg


def test_assumed_workers_noted_in_message():
    msg = warn_if_pool_near_pg_limit(20, 4, assumed=True)
    assert msg is not None
    assert "assumed; set WEB_CONCURRENCY" in msg


def test_silent_when_well_under_limit():
    assert warn_if_pool_near_pg_limit(20, 1) is None


def test_uvicorn_worker_count_reads_env(monkeypatch):
    monkeypatch.setenv("WEB_CONCURRENCY", "2")
    monkeypatch.delenv("UVICORN_WORKERS", raising=False)
    monkeypatch.delenv("ENV", raising=False)
    assert uvicorn_worker_count() == (2, False)


def test_uvicorn_worker_count_local_default_is_one(monkeypatch):
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    monkeypatch.delenv("UVICORN_WORKERS", raising=False)
    monkeypatch.setenv("ENV", "development")
    assert uvicorn_worker_count() == (1, True)


def test_uvicorn_worker_count_production_assumes_compose_four(monkeypatch):
    monkeypatch.delenv("WEB_CONCURRENCY", raising=False)
    monkeypatch.delenv("UVICORN_WORKERS", raising=False)
    monkeypatch.setenv("ENV", "production")
    assert uvicorn_worker_count() == (4, True)
