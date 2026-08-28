"""Parse LiveKit SessionReport dicts for ZizkaDB event ingest."""

from __future__ import annotations

from typing import Any


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


def zizka_event_for_report_event(ev: dict[str, Any]) -> str:
    et = (ev.get("type") or ev.get("event") or "livekit_event").lower()
    if "tool" in et and "result" in et:
        return "tool_result"
    if "tool" in et or "function" in et:
        return "tool_call"
    if "error" in et or "fail" in et:
        return "error"
    if "api" in et or "http" in et:
        return "api_call"
    return "livekit_event"


def _sort_key(row: dict[str, Any]) -> float:
    for key in ("created_at", "timestamp", "started_at"):
        val = row.get(key)
        if isinstance(val, (int, float)):
            return float(val)
    return 0.0
