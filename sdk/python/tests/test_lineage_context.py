"""Tests for automatic lineage context."""

import asyncio
import os

import pytest

from zizkadb import ZizkaDB
from zizkadb.context import LineageContext, get_lineage_state


@pytest.mark.asyncio
async def test_track_auto_parents(monkeypatch):
    posted: list[dict] = []

    async def fake_post(_self, path, body):
        posted.append(dict(body))
        return {
            "event_id": f"evt-{len(posted)}",
            "timestamp": "2026-01-01T00:00:00+00:00",
            "sequence_no": len(posted),
            "checksum": "abc",
            "indexed": False,
        }

    monkeypatch.setattr(ZizkaDB, "_post", fake_post)

    async with ZizkaDB(host="http://localhost:8000") as db:
        async with db.track(agent="bot-a") as ctx:
            await db.log(agent="bot-a", event="user_message", data={"text": "hi"})
            await db.log(agent="bot-a", event="tool_call", data={"tool": "x"})

    assert len(posted) == 2
    assert posted[0]["parent_id"] is None
    assert posted[1]["parent_id"] == "evt-1"
    assert posted[0]["session_id"] == posted[1]["session_id"] == ctx.session_id


@pytest.mark.asyncio
async def test_concurrent_sessions_isolated(monkeypatch):
    async def fake_post(_self, path, body):
        return {
            "event_id": f"{body['session_id']}-1",
            "timestamp": "2026-01-01T00:00:00+00:00",
            "sequence_no": 1,
            "checksum": "abc",
            "indexed": False,
        }

    monkeypatch.setattr(ZizkaDB, "_post", fake_post)

    async with ZizkaDB(host="http://localhost:8000") as db:
        async def run(agent: str):
            async with db.track(agent=agent) as ctx:
                assert get_lineage_state() is not None
                await db.log(agent=agent, event="user_message", data={})
                return ctx.session_id

        s1, s2 = await asyncio.gather(run("a"), run("b"))
        assert s1 != s2


@pytest.mark.asyncio
async def test_log_fork(monkeypatch):
    posted: list[dict] = []

    async def fake_post(_self, path, body):
        posted.append(dict(body))
        return {
            "event_id": f"evt-{len(posted)}",
            "timestamp": "2026-01-01T00:00:00+00:00",
            "sequence_no": len(posted),
            "checksum": "abc",
            "indexed": False,
        }

    monkeypatch.setattr(ZizkaDB, "_post", fake_post)

    async with ZizkaDB(host="http://localhost:8000") as db:
        async with db.track(agent="bot") as ctx:
            await db.log(agent="bot", event="user_message", data={})
            ctx.fork()
            await db.log(agent="bot", event="tool_call", data={"tool": "a"})
            await db.log(agent="bot", event="tool_call", data={"tool": "b"})

    assert posted[1]["parent_id"] == "evt-1"
    assert posted[2]["parent_id"] == "evt-1"
