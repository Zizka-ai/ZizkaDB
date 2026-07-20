"""
ZizkaDB MCP Server

Exposes ZizkaDB as MCP tools so any MCP-compatible agent
(Claude Desktop, Cursor, LangChain MCP, CrewAI, AutoGen, etc.)
can log events, search memory, replay sessions, and debug decisions
without installing any SDK.

Configuration (env vars):
  ZIZKADB_HOST     — defaults to https://db.zizka.ai
  ZIZKADB_API_KEY  — your API key (zizkadb_live_... or legacy agdb_live_...)
  AGENTDB_API_KEY  — legacy alias for ZIZKADB_API_KEY

Usage:
  uvx zizkadb-mcp                          # managed service
  ZIZKADB_HOST=http://localhost:8000 uvx zizkadb-mcp  # self-hosted
"""

from __future__ import annotations

import os
import sys
import platform
import threading
import uuid
from pathlib import Path
from urllib.parse import quote, urlencode

import httpx
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("ZizkaDB")

try:
    from importlib.metadata import version as _pkg_version

    __version__ = _pkg_version("zizkadb-mcp")
except Exception:
    __version__ = "0.1.4"

DEFAULT_DEV_API_KEY = "zizkadb_dev_local"
_HOST = (
    os.getenv("ZIZKADB_HOST")
    or os.getenv("AGENTDB_HOST")
    or "https://db.zizka.ai"
).rstrip("/")
_KEY = os.getenv("ZIZKADB_API_KEY") or os.getenv("AGENTDB_API_KEY") or ""


def _is_local_host(host: str) -> bool:
    h = host.lower()
    return "localhost" in h or "127.0.0.1" in h or "0.0.0.0" in h


if not _KEY and _HOST and _is_local_host(_HOST):
    _KEY = os.getenv("DEV_API_KEY", DEFAULT_DEV_API_KEY)

# MCP runs over stdio — stdout is protocol, so diagnostics go to stderr only.
if not _KEY:
    print(
        f"zizkadb-mcp: ZIZKADB_API_KEY is not set — every tool call against {_HOST} "
        "will fail with 401. Add it to the env block of your MCP config "
        "(~/.cursor/mcp.json, claude_desktop_config.json, ...).",
        file=sys.stderr,
    )

# ── Anonymous telemetry (opt-out: ZIZKADB_TELEMETRY=false) ────────────────────

def _get_install_id() -> str:
    try:
        path = Path.home() / ".zizkadb" / "install_id"
        path.parent.mkdir(parents=True, exist_ok=True)
        if path.exists():
            iid = path.read_text().strip()
            if iid:
                return iid
        iid = str(uuid.uuid4())
        path.write_text(iid)
        return iid
    except Exception:
        return str(uuid.uuid4())


def _telemetry_ping() -> None:
    if os.getenv("ZIZKADB_TELEMETRY", "").lower() in ("false", "0", "no", "off"):
        return
    try:
        import urllib.request, json
        mode = "self-hosted" if os.getenv("ZIZKADB_HOST") else "cloud"
        payload = json.dumps({
            "install_id":  _get_install_id(),
            "sdk":         "mcp",
            "sdk_version": __version__,
            "python":      f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "os":          platform.system(),
            "mode":        mode,
        }).encode()
        req = urllib.request.Request(
            "https://db.zizka.ai/v1/telemetry",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        urllib.request.urlopen(req, timeout=3)
    except Exception:
        pass


threading.Thread(target=_telemetry_ping, daemon=True).start()


def _error_detail(resp: httpx.Response) -> str:
    """Best-effort extraction of the server's {"detail": ...} message."""
    try:
        detail = resp.json().get("detail")
        if detail:
            return str(detail)
    except Exception:
        pass
    return resp.text


def _missing_key_error() -> dict:
    if _is_local_host(_HOST):
        hint = (
            f"Self-hosted at {_HOST}: create a key in your dashboard "
            "(http://localhost:3001 → Settings → API keys) or run the server "
            "with ENV=development to use the built-in dev key."
        )
    else:
        hint = (
            "Sign up at https://db.zizka.ai → Settings → Create API key, "
            "then add it to your MCP config env."
        )
    return {"error": f"ZIZKADB_API_KEY is not set. {hint}", "status": 401}


def _auth_hint() -> str:
    """Host-aware remediation hint attached to 401 responses."""
    if _is_local_host(_HOST):
        return (
            f"Hint for self-hosted {_HOST}: check that ZIZKADB_API_KEY matches a key "
            "from your own dashboard (http://localhost:3001 → Settings → API keys), "
            "or that the server runs with ENV=development if you rely on the built-in "
            "dev key. A key created on db.zizka.ai will NOT work on a self-hosted "
            "instance (and vice versa)."
        )
    return (
        f"Hint: check that ZIZKADB_API_KEY in your MCP config is a valid, non-revoked "
        f"key for {_HOST} (manage keys at https://db.zizka.ai → Settings → API keys). "
        "A key from a self-hosted instance will NOT work on db.zizka.ai (and vice versa)."
    )


async def _api(method: str, path: str, body: dict | None = None) -> dict:
    if not _KEY:
        return _missing_key_error()
    headers = {"Content-Type": "application/json", "Authorization": f"Bearer {_KEY}"}

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            url = f"{_HOST}/v1{path}"
            if method == "GET":
                r = await client.get(url, headers=headers)
            elif method == "POST":
                r = await client.post(url, headers=headers, json=body or {})
            elif method == "DELETE":
                r = await client.request("DELETE", url, headers=headers, json=body or {})
            else:
                raise ValueError(f"Unsupported method: {method}")
    except httpx.RequestError as e:
        return {
            "error": (
                f"Cannot reach ZizkaDB at {_HOST} ({type(e).__name__}). "
                "Check that the server is running and that ZIZKADB_HOST in your "
                "MCP config points at it (default: https://db.zizka.ai)."
            ),
            "status": 0,
        }

    if r.is_success:
        return r.json()

    detail = _error_detail(r)
    if r.status_code == 401:
        return {
            "error": f"Authentication failed (401 Unauthorized): {detail}. {_auth_hint()}",
            "status": 401,
        }
    if r.status_code == 403:
        return {
            "error": (
                f"Forbidden (403): {detail}. This usually means the API key is scoped "
                "to a different agent than the one in your request."
            ),
            "status": 403,
        }
    return {"error": detail, "status": r.status_code}


# ── Tools ──────────────────────────────────────────────────────────────────


@mcp.tool()
async def log_event(
    agent: str,
    event: str,
    data: dict,
    session_id: str = "",
    parent_id: str = "",
) -> dict:
    """
    Log an event to ZizkaDB.

    Use this every time your agent takes an action: a tool call, a decision,
    a user message, or an agent response. Logging builds the causal graph
    that powers why(), search_memory(), and get_context().

    Args:
        agent:      Unique identifier for your agent (e.g. "support-bot")
        event:      What happened (e.g. "tool_call", "user_message", "decision")
        data:       Any dict of relevant data (tool name, query, result, etc.)
        session_id: Groups related events into a session (optional)
        parent_id:  event_id of the event that caused this one -- enables causal lineage (optional)

    Returns:
        event_id, timestamp, sequence_no, checksum
    """
    body: dict = {"agent": agent, "event": event, "data": data}
    if session_id:
        body["session_id"] = session_id
    if parent_id:
        body["parent_id"] = parent_id
    return await _api("POST", "/events", body)


@mcp.tool()
async def search_memory(
    query: str,
    agent: str = "",
    limit: int = 10,
) -> dict:
    """
    Semantically search over all logged agent events.

    Finds past decisions, tool calls, conversations, or any event by meaning --
    not just keyword matching. Useful before a new task to see what happened
    in similar past situations.

    Args:
        query: Natural language description of what you're looking for
        agent: Filter to a specific agent (optional -- leave blank to search all)
        limit: Number of results (default 10, max 50)

    Returns:
        List of matching events with relevance scores
    """
    body: dict = {"query": query, "limit": limit}
    if agent:
        body["agent"] = agent
    return await _api("POST", "/search", body)


@mcp.tool()
async def get_context(
    agent: str,
    task: str,
    max_tokens: int = 2000,
    session_id: str = "",
) -> str:
    """
    Get a formatted memory context block ready to inject into a system prompt.

    This is the drop-in replacement for LLM-provided memory (Claude Projects,
    ChatGPT memory). It combines recent events with semantically relevant past
    events, fits within a token budget, and formats as plain text.

    Typical usage:
        context = await get_context("support-bot", "user asking about billing")
        system_prompt = f"You are a support agent.\\n\\n{context}"

    Args:
        agent:      Your agent identifier
        task:       What the agent is about to do (guides semantic retrieval)
        max_tokens: Token budget for the context block (default 2000)
        session_id: Current session ID to exclude from context (optional)

    Returns:
        Formatted context string -- paste directly into your system prompt
    """
    body: dict = {"agent": agent, "task": task, "max_tokens": max_tokens}
    if session_id:
        body["session_id"] = session_id
    result = await _api("POST", "/memory/context", body)
    if isinstance(result, dict):
        if "error" in result:
            # Never fail silently: an empty string would look like "no memory"
            # and hide auth/connectivity problems from the user entirely.
            return f"ZizkaDB error: {result['error']}"
        return result.get("context", "")
    return str(result)


@mcp.tool()
async def why(event_id: str, depth: int = 10) -> dict:
    """
    Trace the causal chain that led to an event.

    Given any event ID, walks back through parent_id links to reconstruct
    the full decision tree: user message -> tool call -> result -> response.
    Essential for debugging why an agent did something unexpected.

    Args:
        event_id: The event you want to explain
        depth:    How many levels back to trace (default 10)

    Returns:
        Ordered list of events from root cause to the specified event
    """
    return await _api(
        "GET",
        f"/events/{quote(event_id, safe='')}/why?{urlencode({'depth': depth})}",
    )


@mcp.tool()
async def query_events(
    agent: str,
    limit: int = 20,
    event_type: str = "",
) -> dict:
    """
    List recent events for an agent.

    Args:
        agent:      Agent identifier to query
        limit:      Number of events to return (default 20)
        event_type: Filter by event type, e.g. "tool_call" (optional)

    Returns:
        List of events ordered by time (most recent first)
    """
    params: dict[str, str | int] = {"agent": agent, "limit": limit}
    if event_type:
        params["event_type"] = event_type
    return await _api("GET", f"/events?{urlencode(params)}")


@mcp.tool()
async def time_travel(agent: str, timestamp: str) -> dict:
    """
    Replay the exact state of an agent at a specific point in time.

    Reconstructs what the agent knew and had done up to that moment.
    Useful for investigating complaints ("what did the agent tell them at 3pm?")
    or comparing behaviour across versions.

    Args:
        agent:     Agent identifier
        timestamp: ISO 8601 datetime, e.g. "2026-05-10T15:00:00Z"

    Returns:
        Agent state snapshot at that moment (events, summary, last_event)
    """
    return await _api(
        "GET",
        f"/events/at?{urlencode({'agent': agent, 'timestamp': timestamp})}",
    )


@mcp.tool()
async def memory_diff(session_id: str) -> dict:
    """
    Summarise what happened in a session.

    Returns event counts, types seen, causal depth, whether any errors
    occurred, and event types that had never appeared in prior sessions.
    Call this at the end of a session to understand what changed.

    Args:
        session_id: The session to analyse

    Returns:
        summary, event_types, total_events, has_errors, new_event_types
    """
    return await _api("GET", f"/memory/diff/{quote(session_id, safe='')}")


@mcp.tool()
async def forget(filter_key: str, filter_value: str) -> dict:
    """
    Delete all events matching a filter (GDPR right to erasure).

    Removes events from both the database and the vector index.
    Commonly used to delete all data for a specific user on request.

    Args:
        filter_key:   Field in event data to match (e.g. "user_id", "email", "session_id")
        filter_value: Value to match (e.g. "user_123", "alice@example.com")

    Returns:
        deleted_events count
    """
    return await _api("DELETE", "/memory/forget", {
        "filter_key": filter_key,
        "filter_value": filter_value,
    })


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()
