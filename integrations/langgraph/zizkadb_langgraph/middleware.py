"""LangGraph node wrapper — logs graph_node events with automatic parent_id."""

from __future__ import annotations

from typing import Any, Callable, Awaitable

from zizkadb import ZizkaDB

STATE_LAST_EVENT_KEY = "zizkadb_last_event_id"


class ZizkaDBLangGraphMiddleware:
    """Attach to a LangGraph state dict key for cross-node lineage."""

    def __init__(self, db: ZizkaDB, agent: str, session_id: str | None = None) -> None:
        self.db = db
        self.agent = agent
        self.session_id = session_id

    async def log_node(
        self,
        state: dict[str, Any],
        node_name: str,
        *,
        input_summary: dict[str, Any] | None = None,
        output_summary: dict[str, Any] | None = None,
        phase: str = "enter",
    ) -> None:
        parent_id = state.get(STATE_LAST_EVENT_KEY)
        event = "graph_node" if phase == "enter" else "graph_node_done"
        data: dict[str, Any] = {"node": node_name, "phase": phase}
        if input_summary:
            data["input"] = input_summary
        if output_summary:
            data["output"] = output_summary
        result = await self.db.log(
            agent=self.agent,
            event=event,
            data=data,
            parent_id=parent_id,
            session_id=self.session_id or state.get("session_id"),
        )
        state[STATE_LAST_EVENT_KEY] = result.event_id


def wrap_node(
    middleware: ZizkaDBLangGraphMiddleware,
    node_name: str,
    fn: Callable[..., Awaitable[dict[str, Any]]],
) -> Callable[..., Awaitable[dict[str, Any]]]:
    """Wrap an async LangGraph node to log enter/exit with causal links."""

    async def wrapped(state: dict[str, Any], *args: Any, **kwargs: Any) -> dict[str, Any]:
        await middleware.log_node(
            state,
            node_name,
            input_summary={"keys": list(state.keys())[:20]},
            phase="enter",
        )
        out = await fn(state, *args, **kwargs)
        if isinstance(out, dict):
            merged = {**state, **out}
        else:
            merged = dict(state)
        await middleware.log_node(
            merged,
            node_name,
            output_summary={"keys": list(merged.keys())[:20]},
            phase="done",
        )
        return out if isinstance(out, dict) else state

    wrapped.__name__ = getattr(fn, "__name__", node_name)
    return wrapped
