"""LangGraph middleware keeps graph state lineage in sync."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from zizkadb_langgraph.middleware import STATE_LAST_EVENT_KEY, ZizkaDBLangGraphMiddleware, wrap_node


def _make_db() -> MagicMock:
    counter = iter(range(1, 100))
    db = MagicMock()

    async def _log(**kwargs):
        result = MagicMock()
        result.event_id = f"evt-{next(counter)}"
        return result

    db.log = AsyncMock(side_effect=_log)
    return db


@pytest.mark.asyncio
async def test_wrap_node_updates_caller_state_after_done():
    db = _make_db()
    mw = ZizkaDBLangGraphMiddleware(db, agent="bot", session_id="sess-1")
    state = {STATE_LAST_EVENT_KEY: "evt-root"}

    async def node(state: dict) -> dict:
        return {"docs": [1]}

    wrapped = wrap_node(mw, "retrieve", node)
    await wrapped(state)

    assert state[STATE_LAST_EVENT_KEY] == "evt-2"
    calls = db.log.call_args_list
    assert len(calls) == 2
    assert calls[0].kwargs["parent_id"] == "evt-root"
    assert calls[1].kwargs["parent_id"] == "evt-1"
