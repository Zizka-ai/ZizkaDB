"""Parse LiveKit SessionReport dicts for ZizkaDB event ingest.

Two things matter here beyond plain parsing:

* **Distinct event types.** LiveKit emits ~15 different pipeline events. Mapping
  them by substring collapsed nearly all of them into a single ``livekit_event``
  type, which made the dashboard unreadable. The mapping is now an explicit
  table, with the substring rule kept only as a fallback for event types added
  by future LiveKit versions.
* **Non-message chat items.** ``chat_history`` holds ``agent_handoff`` and
  ``agent_config_update`` items alongside ordinary messages. Routing everything
  through role detection silently dropped them.
"""

from __future__ import annotations

import logging
import os
from typing import Any

log = logging.getLogger(__name__)

# Verbosity tiers. An event is logged when its tier is at or below the active
# level, so "transcript" is the quietest and "verbose" keeps everything.
TRANSCRIPT = "transcript"
STANDARD = "standard"
VERBOSE = "verbose"

TIER_ORDER = {TRANSCRIPT: 0, STANDARD: 1, VERBOSE: 2}
DEFAULT_LEVEL = STANDARD

# Logged regardless of level: failures and session boundaries are never noise.
ALWAYS_ALLOWED = frozenset({"error", "session_started", "session_ended"})

# LiveKit event type -> ZizkaDB event type. ``None`` means "skip": the same
# information already arrives through chat_history, so logging it here would
# duplicate every turn.
EVENT_TYPE_MAP: dict[str, str | None] = {
    "conversation_item_added": None,
    "user_state_changed": "user_state_changed",
    "agent_state_changed": "agent_state_changed",
    "user_transcription_timeout": "transcription_timeout",
    "agent_false_interruption": "false_interruption",
    "overlapping_speech": "overlapping_speech",
    "function_tools_executed": "tool_result",
    "tool_execution_updated": "tool_progress",
    "session_usage_updated": "usage_updated",
    "speech_created": "speech_created",
    "error": "error",
    "close": "session_closing",
    "debug_message": "debug_message",
    # These two never pass through AgentSession.emit(), so they cannot appear in
    # a session report — the observer captures them from the live event stream.
    "eot_prediction": "eot_prediction",
    "user_turn_exceeded": "user_turn_exceeded",
}

# Chat item type -> ZizkaDB event type. Message items resolve by role instead.
ITEM_TYPE_MAP: dict[str, str] = {
    "agent_handoff": "agent_handoff",
    "agent_config_update": "agent_config_update",
    "function_call": "tool_call",
    "function_call_output": "tool_result",
}

EVENT_TIERS: dict[str, str] = {
    # Conversation content and anything that went wrong.
    "user_message": TRANSCRIPT,
    "assistant_response": TRANSCRIPT,
    "user_transcript": TRANSCRIPT,
    "agent_handoff": TRANSCRIPT,
    "tool_call": TRANSCRIPT,
    "tool_result": TRANSCRIPT,
    "error": TRANSCRIPT,
    "session_started": TRANSCRIPT,
    "session_ended": TRANSCRIPT,
    # Useful pipeline detail, a handful of rows per turn.
    "user_state_changed": STANDARD,
    "agent_state_changed": STANDARD,
    "transcription_timeout": STANDARD,
    "false_interruption": STANDARD,
    "overlapping_speech": STANDARD,
    "usage_updated": STANDARD,
    "user_turn_exceeded": STANDARD,
    "session_closing": STANDARD,
    "livekit_event": STANDARD,
    # High-frequency or bulky; opt in explicitly.
    "user_transcript_partial": VERBOSE,
    "speech_created": VERBOSE,
    "tool_progress": VERBOSE,
    "eot_prediction": VERBOSE,
    "debug_message": VERBOSE,
    "agent_config_update": VERBOSE,
    "livekit_chat_item": VERBOSE,
}

# agent_config_update carries the agent's entire system prompt. Left whole it
# dominates the dashboard row and bloats every session.
_INSTRUCTIONS_LIMIT = 200

# Bounds for the verbose-level ``raw`` copy of a LiveKit payload. These objects
# come from third-party ``model_dump()`` calls, so their shape is not ours to
# trust: cap depth, list length and scalar length rather than shipping whatever
# arrives into every event row.
_MAX_DEPTH = 6
_MAX_ITEMS = 50
_VALUE_LIMIT = 500


def resolve_level(explicit: str | None = None) -> str:
    """Active verbosity: explicit argument, else ZIZKADB_EVENT_LEVEL, else standard."""
    level = (explicit or os.getenv("ZIZKADB_EVENT_LEVEL") or DEFAULT_LEVEL).strip().lower()
    if level not in TIER_ORDER:
        log.warning(
            "zizkadb: unknown ZIZKADB_EVENT_LEVEL %r, falling back to %r",
            level,
            DEFAULT_LEVEL,
        )
        return DEFAULT_LEVEL
    return level


def event_allowed(zizka_event: str, level: str) -> bool:
    """Whether an event of this type should be logged at the given level."""
    if zizka_event in ALWAYS_ALLOWED:
        return True
    tier = EVENT_TIERS.get(zizka_event, STANDARD)
    return TIER_ORDER[tier] <= TIER_ORDER.get(level, TIER_ORDER[DEFAULT_LEVEL])


def normalize_report(report: dict[str, Any]) -> dict[str, Any]:
    """Accept make_session_report().to_dict() or an equivalent structure."""
    if not isinstance(report, dict):
        raise TypeError("report must be a dict from SessionReport.to_dict()")
    return report


def chat_items(report: dict[str, Any]) -> list[dict[str, Any]]:
    history = report.get("chat_history") or {}
    if isinstance(history, list):
        items = history
    elif isinstance(history, dict):
        items = history.get("items") or []
    else:
        items = []
    out: list[dict[str, Any]] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        item = dict(raw)
        item_id = item.get("id") or item.get("item_id")
        if item_id is not None:
            item["id"] = str(item_id)
        out.append(item)
    out.sort(key=_sort_key)
    return out


def backend_events(report: dict[str, Any]) -> list[dict[str, Any]]:
    """Non-transcript pipeline events from the session report."""
    rows: list[dict[str, Any]] = []
    for raw in report.get("events") or []:
        if not isinstance(raw, dict):
            continue
        if raw.get("type") == "metrics_collected":
            continue
        rows.append(dict(raw))
    rows.sort(key=_sort_key)
    return rows


def item_text(item: dict[str, Any]) -> str:
    content = item.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict):
                text = part.get("text") or part.get("content")
                if text:
                    parts.append(str(text))
        return "\n".join(parts)
    if content is not None:
        return str(content)
    return ""


def item_role(item: dict[str, Any]) -> str:
    role = (item.get("role") or item.get("speaker") or "unknown").lower()
    if role in ("assistant", "agent"):
        return "assistant"
    if role in ("user", "human"):
        return "user"
    return role


def zizka_event_for_role(role: str) -> str | None:
    if role == "user":
        return "user_message"
    if role == "assistant":
        return "assistant_response"
    return None


def zizka_event_for_item(item: dict[str, Any]) -> str | None:
    """ZizkaDB event type for a chat_history item.

    Branches on the item type first so handoffs and config updates survive;
    plain messages (and legacy items carrying only a role) resolve by role.
    """
    item_type = item.get("type")
    if item_type and item_type != "message":
        mapped = ITEM_TYPE_MAP.get(item_type)
        if mapped is not None:
            return mapped
        # Unknown non-message item: keep it rather than drop it silently.
        return "livekit_chat_item"
    return zizka_event_for_role(item_role(item))


def zizka_event_for_report_event(ev: dict[str, Any]) -> str | None:
    """ZizkaDB event type for a pipeline event, or None to skip it."""
    et = (ev.get("type") or ev.get("event") or "livekit_event").lower()

    if et == "user_input_transcribed":
        is_final = ev.get("is_final")
        return "user_transcript" if is_final or is_final is None else "user_transcript_partial"

    if et in EVENT_TYPE_MAP:
        return EVENT_TYPE_MAP[et]

    # Unknown type from a newer LiveKit: fall back to the old heuristic so it
    # still lands somewhere sensible instead of being lost.
    if "tool" in et and "result" in et:
        return "tool_result"
    if "tool" in et or "function" in et:
        return "tool_call"
    if "error" in et or "fail" in et:
        return "error"
    if "api" in et or "http" in et:
        return "api_call"
    return "livekit_event"


def summarize_event_data(
    zizka_event: str, ev: dict[str, Any], *, level: str = DEFAULT_LEVEL
) -> dict[str, Any]:
    """Build a compact payload that reads well in the dashboard's short preview.

    The full event is preserved under ``raw`` at verbose level, so nothing is
    lost when the caller asks for everything.
    """
    data: dict[str, Any]

    if zizka_event in ("agent_state_changed", "user_state_changed"):
        data = {"from": ev.get("old_state"), "to": ev.get("new_state")}
    elif zizka_event in ("user_transcript", "user_transcript_partial"):
        data = {"content": ev.get("transcript")}
        for key in ("language", "speaker_id"):
            if ev.get(key) is not None:
                data[key] = ev[key]
    elif zizka_event == "eot_prediction":
        data = {"probability": ev.get("probability"), "threshold": ev.get("threshold")}
    elif zizka_event == "overlapping_speech":
        data = {
            "is_interruption": ev.get("is_interruption"),
            "agent_ended": ev.get("agent_ended"),
            "total_duration": ev.get("total_duration"),
        }
    elif zizka_event == "false_interruption":
        data = {"resumed": ev.get("resumed")}
        if ev.get("extra_instructions"):
            data["extra_instructions"] = _truncate(str(ev["extra_instructions"]))
    elif zizka_event == "speech_created":
        data = {"source": ev.get("source"), "user_initiated": ev.get("user_initiated")}
    elif zizka_event == "tool_result" and "function_calls" in ev:
        data = {"tools": _tool_names(ev.get("function_calls"))}
    elif zizka_event == "transcription_timeout":
        data = {"speech_duration": ev.get("speech_duration")}
    elif zizka_event == "user_turn_exceeded":
        data = {
            "duration": ev.get("duration"),
            "word_count": ev.get("accumulated_word_count"),
        }
    elif zizka_event == "usage_updated":
        data = {"usage": _usage_summary(ev.get("usage"))}
    elif zizka_event == "session_closing":
        data = {"reason": ev.get("reason"), "error": ev.get("error")}
    elif zizka_event == "error":
        data = {"error": _stringify(ev.get("error")), "source": _stringify(ev.get("source"))}
    else:
        data = {k: v for k, v in ev.items() if k not in ("type", "event")}

    data = {k: v for k, v in data.items() if v is not None}

    if ev.get("type") or ev.get("event"):
        data["livekit_type"] = ev.get("type") or ev.get("event")
    if level == VERBOSE:
        data["raw"] = {k: _stringify(v) for k, v in ev.items()}
    return data


def summarize_item_data(
    zizka_event: str, item: dict[str, Any], *, level: str = DEFAULT_LEVEL
) -> dict[str, Any]:
    """Compact payload for a chat_history item."""
    data: dict[str, Any] = {}

    if zizka_event in ("user_message", "assistant_response"):
        data["content"] = item_text(item)
        if item.get("interrupted") is not None:
            data["interrupted"] = item["interrupted"]
    elif zizka_event == "agent_handoff":
        data = {
            "from_agent": item.get("old_agent_id"),
            "to_agent": item.get("new_agent_id"),
        }
    elif zizka_event == "agent_config_update":
        if item.get("instructions"):
            data["instructions"] = _truncate(str(item["instructions"]))
        tools = item.get("tools")
        if isinstance(tools, list):
            data["tools"] = [_tool_name(t) for t in tools]
    elif zizka_event in ("tool_call", "tool_result"):
        data = {
            "tool": item.get("name") or item.get("tool"),
            "call_id": item.get("call_id"),
        }
        payload = item.get("arguments") if zizka_event == "tool_call" else item.get("output")
        if payload is not None:
            data["args" if zizka_event == "tool_call" else "output"] = _truncate(
                _stringify(payload), 500
            )
    else:
        data = {k: v for k, v in item.items() if k not in ("id", "type")}

    data = {k: v for k, v in data.items() if v is not None}

    if item.get("created_at") is not None:
        data["created_at"] = item["created_at"]
    if item.get("type"):
        data["livekit_item_type"] = item["type"]
    if level == VERBOSE:
        data["raw"] = {k: _stringify(v) for k, v in item.items()}
    return data


def event_key(ev: dict[str, Any]) -> tuple[str, float] | None:
    """Dedupe key for a pipeline event seen both live and in the report."""
    et = ev.get("type") or ev.get("event")
    created = ev.get("created_at")
    if not et or not isinstance(created, (int, float)):
        return None
    return (str(et), float(created))


def _truncate(text: str, limit: int = _INSTRUCTIONS_LIMIT) -> str:
    return text if len(text) <= limit else text[:limit] + "…"


def _stringify(value: Any, _depth: int = 0) -> Any:
    """JSON-safe copy of a LiveKit payload.

    Depth-limited because these come from ``model_dump()`` on third-party objects:
    a deeply nested or self-referential structure would otherwise blow the stack
    inside an event handler, and this runs during a live call.
    """
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if _depth >= _MAX_DEPTH:
        return _truncate(str(value), _VALUE_LIMIT)
    if isinstance(value, dict):
        return {str(k): _stringify(v, _depth + 1) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_stringify(v, _depth + 1) for v in value[:_MAX_ITEMS]]
    return _truncate(str(value), _VALUE_LIMIT)


def _tool_name(tool: Any) -> str:
    if isinstance(tool, dict):
        return str(tool.get("name") or tool.get("tool") or tool)
    return str(tool)


def _tool_names(calls: Any) -> list[str] | None:
    if not isinstance(calls, list):
        return None
    return [_tool_name(c) for c in calls]


def _usage_summary(usage: Any) -> Any:
    """Keep token totals; drop the per-model breakdown that bloats the row."""
    if not isinstance(usage, dict):
        return _stringify(usage)
    summary = {
        k: v
        for k, v in usage.items()
        if k != "model_usage" and isinstance(v, (int, float, str))
    }
    models = usage.get("model_usage")
    if isinstance(models, list):
        summary["models"] = len(models)
        summary["input_tokens"] = sum(
            m.get("input_tokens", 0) for m in models if isinstance(m, dict)
        )
        summary["output_tokens"] = sum(
            m.get("output_tokens", 0) for m in models if isinstance(m, dict)
        )
    return summary


def _sort_key(row: dict[str, Any]) -> float:
    for key in ("created_at", "timestamp", "started_at"):
        val = row.get(key)
        if isinstance(val, (int, float)):
            return float(val)
    return 0.0
