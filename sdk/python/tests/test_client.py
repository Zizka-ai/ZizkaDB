import asyncio
import json

import httpx
import pytest

from zizkadb.client import ZizkaDB
from zizkadb.exceptions import AgentScopeError, AuthError, NotFoundError, RateLimitError, ZizkaDBError


def _prevent_telemetry(monkeypatch):
    """Stop telemetry from firing before/inside ZizkaDB.__init__."""
    monkeypatch.setattr("zizkadb.client._telemetry_ping", lambda mode, sdk="python": None)
    monkeypatch.setenv("ZIZKADB_TELEMETRY", "false")


def _client(monkeypatch, response_handler, api_key="zizkadb_live_test", host="https://example.test"):
    _prevent_telemetry(monkeypatch)
    db = ZizkaDB(api_key=api_key, host=host)
    db._client = httpx.AsyncClient(
        transport=httpx.MockTransport(response_handler),
        base_url=db._base_url,
        headers=db._headers(),
    )
    return db


async def _close(db):
    await db._client.aclose()


def test_log_posts_expected_event_payload(monkeypatch):
    captures = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captures["method"] = request.method
        captures["url"] = str(request.url)
        captures["auth"] = request.headers.get("authorization")
        captures["body"] = request.read().decode()
        return httpx.Response(
            200,
            json={
                "event_id": "00000000-0000-0000-0000-000000000001",
                "timestamp": "2026-06-19T00:00:00Z",
                "sequence_no": 1,
                "checksum": "abc123",
            },
        )

    db = _client(monkeypatch, handler)
    try:
        result = asyncio.run(
            db.log(
                agent="test-agent",
                event="tool_call",
                data={"tool": "search"},
                parent_id="parent-1",
                session_id="session-1",
            )
        )
    finally:
        asyncio.run(_close(db))

    assert captures["method"] == "POST"
    assert captures["url"] == "https://example.test/v1/events"
    assert captures["auth"] == "Bearer zizkadb_live_test"
    body_json = captures["body"]
    body = json.loads(body_json)
    assert body["agent"] == "test-agent"
    assert body["event"] == "tool_call"
    assert body["data"] == {"tool": "search"}
    assert body["parent_id"] == "parent-1"
    assert body["session_id"] == "session-1"
    assert body["metadata"] is None
    assert result.event_id == "00000000-0000-0000-0000-000000000001"
    assert result.sequence_no == 1


def test_log_prints_why_hint_on_localhost(monkeypatch, capsys):
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "event_id": "00000000-0000-0000-0000-000000000001",
                "timestamp": "2026-06-19T00:00:00Z",
                "sequence_no": 1,
                "checksum": "abc123",
            },
        )

    db = _client(monkeypatch, handler, host="http://localhost:8000")
    try:
        asyncio.run(db.log(agent="test-agent", event="tool_call", data={"tool": "search"}))
    finally:
        asyncio.run(_close(db))

    err = capsys.readouterr().err
    assert "zizkadb why 00000000-0000-0000-0000-000000000001" in err


def test_log_hint_suppressed_when_quiet(monkeypatch, capsys):
    monkeypatch.setenv("ZIZKADB_QUIET", "1")

    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={
                "event_id": "00000000-0000-0000-0000-000000000001",
                "timestamp": "2026-06-19T00:00:00Z",
                "sequence_no": 1,
                "checksum": "abc123",
            },
        )

    db = _client(monkeypatch, handler, host="http://localhost:8000")
    try:
        asyncio.run(db.log(agent="test-agent", event="tool_call", data={"tool": "search"}))
    finally:
        asyncio.run(_close(db))

    assert "zizkadb why" not in capsys.readouterr().err


@pytest.mark.parametrize(
    ("status", "payload", "error_type"),
    [
        (401, {"detail": "bad key"}, AuthError),
        (403, {"detail": "wrong agent"}, AgentScopeError),
        (404, {"detail": "missing"}, NotFoundError),
        (429, {"detail": "slow down"}, RateLimitError),
        (500, {"detail": "boom"}, ZizkaDBError),
    ],
)
def test_error_mapping(monkeypatch, status, payload, error_type):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status, json=payload)

    db = _client(monkeypatch, handler)
    try:
        with pytest.raises(error_type):
            asyncio.run(db.query(agent="test-agent"))
    finally:
        asyncio.run(_close(db))


def test_localhost_auto_injects_dev_key(monkeypatch):
    _prevent_telemetry(monkeypatch)
    monkeypatch.delenv("ZIZKADB_API_KEY", raising=False)
    monkeypatch.delenv("AGENTDB_API_KEY", raising=False)
    monkeypatch.delenv("DEV_API_KEY", raising=False)

    db = ZizkaDB(host="http://localhost:8000")

    assert db._api_key == "zizkadb_dev_local"
    assert db._headers()["Authorization"] == "Bearer zizkadb_dev_local"


def test_log_sends_null_for_omitted_parent_and_session(monkeypatch):
    """The SDK sends parent_id: null and session_id: null when not provided."""
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["body"] = request.read().decode()
        return httpx.Response(200, json={"event_id": "evt-1", "timestamp": "2026-01-01T00:00:00Z", "sequence_no": 1, "checksum": "x"})

    db = _client(monkeypatch, handler)
    try:
        asyncio.run(db.log(agent="a", event="e", data={}))
    finally:
        asyncio.run(_close(db))

    body = json.loads(captured["body"])
    assert body["parent_id"] is None
    assert body["session_id"] is None
