"""
ZizkaDB MCP server — unit tests.

Tests cover the _api() helper and all @mcp.tool() functions using
mocked httpx responses. No running server or database required.
"""

from __future__ import annotations

import json
import httpx
import pytest
import importlib
import sys
from unittest.mock import AsyncMock, MagicMock, patch


# ── Helpers ────────────────────────────────────────────────────────────────

def _mock_response(status_code: int, body: dict | list) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.is_success = 200 <= status_code < 300
    resp.text = json.dumps(body)
    resp.json = MagicMock(return_value=body)
    return resp


def _patch_api(body: dict | list, status: int = 200):
    """Patch _api() to return a fixed response dict."""
    return patch(
        "zizkadb_mcp.server._api",
        new=AsyncMock(return_value=body if status < 400 else {"error": str(body), "status": status}),
    )


def _client(return_value=None, side_effect=None):
    """Mock httpx.AsyncClient where every HTTP method shares the same stub."""
    client = AsyncMock()
    client.__aenter__ = AsyncMock(return_value=client)
    client.__aexit__ = AsyncMock(return_value=None)
    for method in ("get", "post", "request"):
        setattr(client, method, AsyncMock(return_value=return_value, side_effect=side_effect))
    return client


# ── _api helper ────────────────────────────────────────────────────────────

class TestApiHelper:
    @pytest.mark.asyncio
    async def test_returns_error_dict_when_key_missing(self, monkeypatch):
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "")
        from zizkadb_mcp.server import _api
        result = await _api("GET", "/events")
        assert "error" in result
        assert result["status"] == 401

    @pytest.mark.asyncio
    async def test_get_request(self, monkeypatch):
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "zizkadb_dev_local")
        mock_resp = _mock_response(200, {"events": []})
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_resp)

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=mock_client):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")
        assert result == {"events": []}

    @pytest.mark.asyncio
    async def test_post_request(self, monkeypatch):
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "zizkadb_dev_local")
        body = {"event_id": "abc", "timestamp": "2026-01-01T00:00:00Z", "sequence_no": 1}
        mock_resp = _mock_response(201, body)
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.post = AsyncMock(return_value=mock_resp)

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=mock_client):
            from zizkadb_mcp.server import _api
            result = await _api("POST", "/events", {"agent": "bot", "event": "e", "data": {}})
        assert result["event_id"] == "abc"

    @pytest.mark.asyncio
    async def test_error_response_returns_error_dict(self, monkeypatch):
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "zizkadb_dev_local")
        mock_resp = _mock_response(401, {"detail": "Invalid API key"})
        mock_client = AsyncMock()
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client.get = AsyncMock(return_value=mock_resp)

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=mock_client):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")
        assert "error" in result
        assert result["status"] == 401


# ── log_event ──────────────────────────────────────────────────────────────

class TestLogEvent:
    @pytest.mark.asyncio
    async def test_logs_basic_event(self):
        expected = {"event_id": "evt-1", "timestamp": "2026-01-01T00:00:00Z", "sequence_no": 1}
        with _patch_api(expected):
            from zizkadb_mcp.server import log_event
            result = await log_event(agent="bot", event="tool_call", data={"tool": "search"})
        assert result["event_id"] == "evt-1"

    @pytest.mark.asyncio
    async def test_omits_empty_session_and_parent(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["body"] = body
            return {"event_id": "x", "timestamp": "t", "sequence_no": 1}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import log_event
            await log_event(agent="bot", event="e", data={})

        assert "session_id" not in captured["body"]
        assert "parent_id" not in captured["body"]

    @pytest.mark.asyncio
    async def test_includes_session_id_when_provided(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["body"] = body
            return {"event_id": "x", "timestamp": "t", "sequence_no": 1}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import log_event
            await log_event(agent="bot", event="e", data={}, session_id="sess-1")

        assert captured["body"]["session_id"] == "sess-1"


# ── search_memory ──────────────────────────────────────────────────────────

class TestSearchMemory:
    @pytest.mark.asyncio
    async def test_search_returns_results(self):
        expected = {"results": [{"event_id": "e1", "score": 0.9}]}
        with _patch_api(expected):
            from zizkadb_mcp.server import search_memory
            result = await search_memory(query="billing issue")
        assert result == expected

    @pytest.mark.asyncio
    async def test_agent_filter_included_when_provided(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["body"] = body
            return {}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import search_memory
            await search_memory(query="q", agent="support-bot")

        assert captured["body"]["agent"] == "support-bot"

    @pytest.mark.asyncio
    async def test_agent_filter_omitted_when_empty(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["body"] = body
            return {}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import search_memory
            await search_memory(query="q")

        assert "agent" not in captured["body"]


# ── get_context ────────────────────────────────────────────────────────────

class TestGetContext:
    @pytest.mark.asyncio
    async def test_returns_context_string(self):
        api_resp = {"context": "=== Agent Memory ===\n...\n=== End Memory ===\n", "event_count": 3}
        with _patch_api(api_resp):
            from zizkadb_mcp.server import get_context
            result = await get_context(agent="bot", task="answer billing question")
        assert "Agent Memory" in result

    @pytest.mark.asyncio
    async def test_returns_empty_string_when_no_context(self):
        with _patch_api({"context": "", "event_count": 0}):
            from zizkadb_mcp.server import get_context
            result = await get_context(agent="bot", task="something")
        assert result == ""

    @pytest.mark.asyncio
    async def test_error_response_returned_as_string(self):
        with _patch_api({"error": "Embedding failed", "status": 400}, status=400):
            from zizkadb_mcp.server import get_context
            result = await get_context(agent="bot", task="task")
        # Should not raise, just return a string
        assert isinstance(result, str)


# ── why ────────────────────────────────────────────────────────────────────

class TestWhy:
    @pytest.mark.asyncio
    async def test_returns_causal_chain(self):
        expected = {"event_id": "evt-5", "chain_length": 3, "chain": []}
        with _patch_api(expected):
            from zizkadb_mcp.server import why
            result = await why(event_id="evt-5")
        assert result["chain_length"] == 3

    @pytest.mark.asyncio
    async def test_url_encodes_event_id(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["path"] = path
            return {}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import why
            await why(event_id="evt with spaces")

        assert "evt+with+spaces" in captured["path"] or "evt%20with%20spaces" in captured["path"]


# ── forget ─────────────────────────────────────────────────────────────────

class TestForget:
    @pytest.mark.asyncio
    async def test_sends_delete_with_filter(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["method"] = method
            captured["body"] = body
            return {"deleted_events": 3}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import forget
            result = await forget(filter_key="user_id", filter_value="user_123")

        assert captured["method"] == "DELETE"
        assert captured["body"]["filter_key"] == "user_id"
        assert captured["body"]["filter_value"] == "user_123"
        assert result["deleted_events"] == 3


# ── memory_diff ────────────────────────────────────────────────────────────

class TestMemoryDiff:
    @pytest.mark.asyncio
    async def test_returns_session_summary(self):
        expected = {"session_id": "sess-1", "event_count": 10, "has_errors": False}
        with _patch_api(expected):
            from zizkadb_mcp.server import memory_diff
            result = await memory_diff(session_id="sess-1")
        assert result["event_count"] == 10

    @pytest.mark.asyncio
    async def test_url_encodes_session_id(self):
        captured = {}

        async def capture(method, path, body=None):
            captured["path"] = path
            return {}

        with patch("zizkadb_mcp.server._api", new=capture):
            from zizkadb_mcp.server import memory_diff
            await memory_diff(session_id="sess/with/slashes")

        assert "sess/with/slashes" not in captured["path"]


# ── Auth error clarity (issue #85, task 8) ─────────────────────────────────
#
# Connecting the MCP server with wrong credentials must produce obvious,
# actionable errors — never raw JSON blobs, uncaught exceptions, or (worst)
# silent empty responses.

class TestAuthErrorClarity:
    @pytest.mark.asyncio
    async def test_401_surfaces_server_detail_and_cloud_hint(self, monkeypatch):
        """Wrong key on cloud: the server's detail AND a remediation hint."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "bad_key")
        monkeypatch.setattr("zizkadb_mcp.server._HOST", "https://db.zizka.ai")
        resp = _mock_response(401, {"detail": "Invalid or revoked API key"})

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=_client(return_value=resp)):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")

        assert result["status"] == 401
        assert "Invalid or revoked API key" in result["error"]  # server detail kept
        assert "Authentication failed" in result["error"]
        assert "db.zizka.ai" in result["error"]  # where to fix it
        # Not the old raw-JSON-blob behaviour:
        assert result["error"] != '{"detail": "Invalid or revoked API key"}'

    @pytest.mark.asyncio
    async def test_401_self_host_hint_on_localhost(self, monkeypatch):
        """Wrong key on self-host: hint must point at the LOCAL dashboard,
        not at the cloud signup page."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "bad_key")
        monkeypatch.setattr("zizkadb_mcp.server._HOST", "http://localhost:8000")
        resp = _mock_response(401, {"detail": "Invalid or revoked API key"})

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=_client(return_value=resp)):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")

        assert result["status"] == 401
        assert "localhost:3001" in result["error"]  # local dashboard
        assert "ENV=development" in result["error"]  # dev-key escape hatch
        assert "Sign up at https://db.zizka.ai" not in result["error"]

    @pytest.mark.asyncio
    async def test_403_explains_agent_scope(self, monkeypatch):
        """Scoped-key mismatch: surface the server's detail and say 'scoped'."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "scoped_key")
        detail = "This API key is scoped to agent 'bot-a' only"
        resp = _mock_response(403, {"detail": detail})

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=_client(return_value=resp)):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")

        assert result["status"] == 403
        assert "bot-a" in result["error"]
        assert "scoped" in result["error"]

    @pytest.mark.asyncio
    async def test_unreachable_host_returns_error_not_exception(self, monkeypatch):
        """Server down / wrong ZIZKADB_HOST: previously an uncaught
        httpx.ConnectError traceback — now a clear error naming the host."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "any_key")
        monkeypatch.setattr("zizkadb_mcp.server._HOST", "http://localhost:8000")

        with patch(
            "zizkadb_mcp.server.httpx.AsyncClient",
            return_value=_client(side_effect=httpx.ConnectError("Connection refused")),
        ):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")  # must NOT raise

        assert result["status"] == 0
        assert "Cannot reach" in result["error"]
        assert "localhost:8000" in result["error"]  # names the host it tried
        assert "ZIZKADB_HOST" in result["error"]  # points at the config knob

    @pytest.mark.asyncio
    async def test_non_json_error_body_falls_back_to_text(self, monkeypatch):
        """e.g. an nginx 502 HTML page has no {"detail": ...} — show the body."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "any_key")
        resp = MagicMock()
        resp.status_code = 502
        resp.is_success = False
        resp.text = "<html>Bad Gateway</html>"
        resp.json = MagicMock(side_effect=ValueError("not json"))

        with patch("zizkadb_mcp.server.httpx.AsyncClient", return_value=_client(return_value=resp)):
            from zizkadb_mcp.server import _api
            result = await _api("GET", "/events")

        assert result["status"] == 502
        assert "Bad Gateway" in result["error"]

    @pytest.mark.asyncio
    async def test_missing_key_self_host_hint(self, monkeypatch):
        """No key configured against localhost: point at the local dashboard
        and the dev-key escape hatch, not the cloud signup."""
        monkeypatch.setattr("zizkadb_mcp.server._KEY", "")
        monkeypatch.setattr("zizkadb_mcp.server._HOST", "http://localhost:8000")

        from zizkadb_mcp.server import _api
        result = await _api("GET", "/events")

        assert result["status"] == 401
        assert "ZIZKADB_API_KEY is not set" in result["error"]
        assert "localhost:3001" in result["error"]
        assert "ENV=development" in result["error"]
        assert "Sign up at https://db.zizka.ai" not in result["error"]


class TestGetContextAuthFailure:
    @pytest.mark.asyncio
    async def test_auth_error_is_visible_not_silent(self):
        """Regression: get_context used to return "" on any API error,
        making an auth failure indistinguishable from 'agent has no memory'."""
        error_dict = {
            "error": "Authentication failed (401 Unauthorized): Invalid or revoked API key. Hint: ...",
            "status": 401,
        }
        with patch("zizkadb_mcp.server._api", new=AsyncMock(return_value=error_dict)):
            from zizkadb_mcp.server import get_context
            result = await get_context(agent="bot", task="help user")

        assert result != ""
        assert "Authentication failed" in result

    @pytest.mark.asyncio
    async def test_legitimate_empty_context_stays_empty(self):
        """A real 'no memory' response must still return "" — only errors change."""
        with patch(
            "zizkadb_mcp.server._api",
            new=AsyncMock(return_value={"context": "", "event_count": 0}),
        ):
            from zizkadb_mcp.server import get_context
            result = await get_context(agent="bot", task="something")

        assert result == ""


class TestStartupKeyWarning:
    """The server prints a stderr warning at startup when no key is configured
    (stdout stays clean because it carries the MCP protocol)."""

    def test_warns_on_stderr_when_key_missing(self, monkeypatch, capsys):
        import zizkadb_mcp.server as srv

        for var in ("ZIZKADB_API_KEY", "AGENTDB_API_KEY", "DEV_API_KEY"):
            monkeypatch.delenv(var, raising=False)
        monkeypatch.setenv("ZIZKADB_HOST", "https://db.zizka.ai")

        importlib.reload(srv)
        try:
            assert "ZIZKADB_API_KEY is not set" in capsys.readouterr().err
        finally:
            importlib.reload(srv)  # restore module state for other tests

    def test_no_warning_when_key_present(self, monkeypatch, capsys):
        import zizkadb_mcp.server as srv

        monkeypatch.setenv("ZIZKADB_API_KEY", "zizkadb_live_test")
        importlib.reload(srv)
        try:
            assert "ZIZKADB_API_KEY is not set" not in capsys.readouterr().err
        finally:
            monkeypatch.delenv("ZIZKADB_API_KEY", raising=False)
            importlib.reload(srv)
