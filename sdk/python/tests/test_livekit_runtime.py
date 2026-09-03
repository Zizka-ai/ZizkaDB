"""Observer runtime: non-blocking writes, failure isolation, live capture, dedupe.

The governing rule is that ZizkaDB must never break a voice call: logging is
fire-and-forget and every failure path is swallowed with a warning.
"""

from __future__ import annotations

import asyncio
import logging
from unittest.mock import AsyncMock, MagicMock

import pytest

from zizkadb_livekit import ZizkaDBLiveKitObserver
from zizkadb_livekit.registry import get_observer, pop_observer, register_observer


def _make_db(prefix: str = "evt") -> MagicMock:
    counter = iter(range(1, 1000))
    db = MagicMock()

    async def _log(**kwargs):
        result = MagicMock()
        result.event_id = f"{prefix}-{next(counter)}"
        return result

    db.log = AsyncMock(side_effect=_log)
    return db


def _ctx(job_id: str) -> MagicMock:
    ctx = MagicMock()
    ctx.job.id = job_id
    return ctx


class TestBackgroundQueue:
    @pytest.mark.asyncio
    async def test_enqueue_does_not_block_or_raise(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        for i in range(5):
            observer.enqueue(event="user_message", data={"content": f"m{i}"})
        # Nothing has necessarily been written yet; enqueue must not await.
        await observer.flush()
        assert db.log.call_count == 5

    @pytest.mark.asyncio
    async def test_background_queue_preserves_parent_chain(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        for i in range(5):
            observer.enqueue(event="user_message", data={"i": i})
        await observer.flush()

        calls = db.log.call_args_list
        assert calls[0].kwargs["parent_id"] is None
        for n in range(1, len(calls)):
            assert calls[n].kwargs["parent_id"] == f"evt-{n}"

    @pytest.mark.asyncio
    async def test_flush_is_safe_when_nothing_queued(self):
        observer = ZizkaDBLiveKitObserver(_make_db(), agent="voice", session_id="s1")
        await observer.flush()

    @pytest.mark.asyncio
    async def test_aclose_stops_the_writer(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        observer.enqueue(event="user_message", data={"content": "hi"})
        await observer.aclose()
        assert db.log.call_count == 1


class TestFailureIsolation:
    @pytest.mark.asyncio
    async def test_db_failure_does_not_raise(self, caplog):
        db = MagicMock()
        db.log = AsyncMock(side_effect=ConnectionError("zizkadb down"))
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")

        with caplog.at_level(logging.WARNING):
            observer.enqueue(event="user_message", data={"content": "hi"})
            await observer.flush()

        assert any("zizkadb" in r.message.lower() for r in caplog.records)

    @pytest.mark.asyncio
    async def test_writer_survives_a_failure_and_keeps_going(self):
        db = MagicMock()
        calls: list[str] = []

        async def _log(**kwargs):
            calls.append(kwargs["event"])
            if len(calls) == 1:
                raise ConnectionError("transient")
            result = MagicMock()
            result.event_id = "ok"
            return result

        db.log = AsyncMock(side_effect=_log)
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        observer.enqueue(event="a", data={})
        observer.enqueue(event="b", data={})
        await observer.flush()
        assert calls == ["a", "b"]

    @pytest.mark.asyncio
    async def test_attach_handler_never_propagates(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        handlers: dict[str, object] = {}
        session = MagicMock()
        session.on = lambda name, fn: handlers.__setitem__(name, fn)

        observer.attach(session)
        # A malformed event must not escape into LiveKit's emitter.
        handlers["agent_state_changed"](object())

    @pytest.mark.asyncio
    async def test_attach_tolerates_unknown_event_names(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        session = MagicMock()

        def _on(name, fn):
            if name == "eot_prediction":
                raise ValueError("unsupported in this livekit version")

        session.on = _on
        observer.attach(session)  # must not raise

    @pytest.mark.asyncio
    async def test_ingest_session_report_swallows_runtime_error(self):
        db = _make_db()
        ctx = MagicMock()
        ctx.make_session_report.side_effect = RuntimeError("still recording")
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        assert await observer.ingest_session_report(ctx) == []


class TestLiveCapture:
    def _attach(self, observer) -> dict:
        handlers: dict[str, object] = {}
        session = MagicMock()
        session.on = lambda name, fn: handlers.__setitem__(name, fn)
        observer.attach(session)
        return handlers

    @pytest.mark.asyncio
    async def test_live_only_events_captured_via_attach(self):
        """eot_prediction/user_turn_exceeded never reach the session report."""
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1", level="verbose")
        handlers = self._attach(observer)

        assert "eot_prediction" in handlers
        assert "user_turn_exceeded" in handlers

        ev = MagicMock()
        ev.type = "eot_prediction"
        ev.model_dump.return_value = {
            "type": "eot_prediction",
            "probability": 0.01,
            "threshold": 0.56,
            "created_at": 1.0,
        }
        handlers["eot_prediction"](ev)
        await observer.flush()

        logged = [c.kwargs["event"] for c in db.log.call_args_list]
        assert "eot_prediction" in logged

    @pytest.mark.asyncio
    async def test_state_changes_captured_live(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        handlers = self._attach(observer)

        ev = MagicMock()
        ev.type = "agent_state_changed"
        ev.model_dump.return_value = {
            "type": "agent_state_changed",
            "old_state": "listening",
            "new_state": "speaking",
            "created_at": 2.0,
        }
        handlers["agent_state_changed"](ev)
        await observer.flush()

        call = db.log.call_args_list[0]
        assert call.kwargs["event"] == "agent_state_changed"
        assert call.kwargs["data"]["from"] == "listening"

    @pytest.mark.asyncio
    async def test_verbose_only_events_filtered_at_standard(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1", level="standard")
        handlers = self._attach(observer)

        ev = MagicMock()
        ev.type = "eot_prediction"
        ev.model_dump.return_value = {
            "type": "eot_prediction",
            "probability": 0.01,
            "threshold": 0.56,
            "created_at": 3.0,
        }
        handlers["eot_prediction"](ev)
        await observer.flush()
        assert db.log.call_count == 0


class TestDedupe:
    @pytest.mark.asyncio
    async def test_no_duplicate_between_live_and_report(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        handlers: dict[str, object] = {}
        session = MagicMock()
        session.on = lambda name, fn: handlers.__setitem__(name, fn)
        observer.attach(session)

        payload = {
            "type": "agent_state_changed",
            "old_state": "listening",
            "new_state": "speaking",
            "created_at": 5.0,
        }
        ev = MagicMock()
        ev.type = "agent_state_changed"
        ev.model_dump.return_value = payload
        handlers["agent_state_changed"](ev)
        await observer.flush()
        live_count = db.log.call_count

        await observer.ingest_report(
            {"room": "r", "job_id": "j", "chat_history": {"items": []}, "events": [payload]}
        )

        logged = [c.kwargs["event"] for c in db.log.call_args_list]
        assert logged.count("agent_state_changed") == 1
        assert live_count == 1


class TestRegistry:
    def test_distinct_contexts_get_distinct_observers(self):
        db = _make_db()
        a = ZizkaDBLiveKitObserver(db, agent="voice", session_id="a")
        b = ZizkaDBLiveKitObserver(db, agent="voice", session_id="b")
        ctx_a, ctx_b = _ctx("job-a"), _ctx("job-b")

        register_observer(ctx_a, a)
        register_observer(ctx_b, b)
        try:
            assert get_observer(ctx_a) is a
            assert get_observer(ctx_b) is b
        finally:
            pop_observer(ctx_a)
            pop_observer(ctx_b)

    def test_pop_removes(self):
        db = _make_db()
        obs = ZizkaDBLiveKitObserver(db, agent="voice", session_id="a")
        ctx = _ctx("job-c")
        register_observer(ctx, obs)
        assert pop_observer(ctx) is obs
        assert get_observer(ctx) is None
        assert pop_observer(ctx) is None

    def test_context_without_job_id_still_works(self):
        db = _make_db()
        obs = ZizkaDBLiveKitObserver(db, agent="voice", session_id="a")
        ctx = MagicMock()
        ctx.job = None
        register_observer(ctx, obs)
        try:
            assert get_observer(ctx) is obs
        finally:
            pop_observer(ctx)


class TestSessionLifecycle:
    @pytest.mark.asyncio
    async def test_duration_and_usage_on_session_ended(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        await observer.ingest_report(
            {
                "room": "r",
                "job_id": "j",
                "timestamp": 100.0,
                "usage": [{"model": "gemma", "input_tokens": 10}],
                "chat_history": {"items": []},
                "events": [
                    {
                        "type": "agent_state_changed",
                        "old_state": "a",
                        "new_state": "b",
                        "created_at": 40.0,
                    }
                ],
            }
        )
        ended = [c for c in db.log.call_args_list if c.kwargs["event"] == "session_ended"]
        assert len(ended) == 1
        data = ended[0].kwargs["data"]
        assert data["duration_s"] == pytest.approx(60.0)
        assert data["usage"] == [{"model": "gemma", "input_tokens": 10}]

    @pytest.mark.asyncio
    async def test_agent_handoff_item_is_logged(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        await observer.ingest_report(
            {
                "room": "r",
                "job_id": "j",
                "chat_history": {
                    "items": [
                        {
                            "id": "i1",
                            "type": "agent_handoff",
                            "new_agent_id": "assistant",
                            "created_at": 1.0,
                        },
                        {
                            "id": "i2",
                            "type": "message",
                            "role": "user",
                            "content": ["hi"],
                            "created_at": 2.0,
                        },
                    ]
                },
                "events": [],
            }
        )
        logged = [c.kwargs["event"] for c in db.log.call_args_list]
        assert "agent_handoff" in logged
        assert "user_message" in logged


class TestCausalChainIntegrity:
    """The parent_id chain is what `why()` walks; a fork makes lineage wrong."""

    @pytest.mark.asyncio
    async def test_chain_stays_single_stranded_under_concurrent_writes(self):
        """Live events arriving during ingest_report must not fork the chain.

        The background writer and ingest_report both write directly and both
        read-modify-write `last_event_id`. Without a lock held across the round
        trip they interleave into two parallel strands.
        """
        seen: list[tuple[str | None, str]] = []
        counter = iter(range(1, 1000))
        db = MagicMock()

        async def _log(**kwargs):
            event_id = f"e{next(counter)}"
            seen.append((kwargs["parent_id"], event_id))
            await asyncio.sleep(0.005)  # network latency widens the window
            result = MagicMock()
            result.event_id = event_id
            return result

        db.log = AsyncMock(side_effect=_log)
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")

        async def live_traffic():
            for i in range(4):
                await asyncio.sleep(0.003)
                observer.enqueue(event=f"live{i}", data={"i": i})

        traffic = asyncio.create_task(live_traffic())
        await observer.ingest_report(
            {
                "room": "r",
                "job_id": "j",
                "chat_history": {
                    "items": [
                        {"id": f"i{n}", "role": "user", "content": "m", "created_at": float(n)}
                        for n in range(4)
                    ]
                },
                "events": [],
            }
        )
        await traffic
        await observer.flush()

        parents = [p for p, _ in seen if p is not None]
        assert len(parents) == len(set(parents)), "parent_id reused: chain forked"

        # Exactly one root, and every other event links to the event before it.
        assert [p for p, _ in seen].count(None) == 1
        ids = [e for _, e in seen]
        assert parents == ids[:-1], "chain is not a single strand"


class TestLifecycle:
    @pytest.mark.asyncio
    async def test_aclose_is_idempotent(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        observer.enqueue(event="user_message", data={"content": "hi"})
        await observer.aclose()
        await observer.aclose()
        assert db.log.call_count == 1

    @pytest.mark.asyncio
    async def test_enqueue_after_close_is_dropped(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        await observer.aclose()
        observer.enqueue(event="user_message", data={"content": "late"})
        await observer.flush()
        assert db.log.call_count == 0

    @pytest.mark.asyncio
    async def test_async_context_manager_closes(self):
        db = _make_db()
        async with ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1") as observer:
            observer.enqueue(event="user_message", data={"content": "hi"})
        assert db.log.call_count == 1
        assert observer._writer_task is None

    def test_observer_survives_a_new_event_loop(self):
        """asyncio.Queue binds to a loop; a reused observer must rebuild it."""
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")

        async def cycle():
            observer.enqueue(event="user_message", data={})
            await observer.flush()

        asyncio.run(cycle())
        asyncio.run(cycle())  # a different loop: must not raise
        assert db.log.call_count == 2


class TestConnectionPooling:
    @pytest.mark.asyncio
    async def test_pooled_client_opened_once_and_closed(self):
        """One keep-alive connection per call, not one per event."""
        db = _make_db()
        db._client = None
        db.__aenter__ = AsyncMock(side_effect=lambda: setattr(db, "_client", object()))
        db.__aexit__ = AsyncMock(side_effect=lambda *a: setattr(db, "_client", None))

        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        for i in range(5):
            observer.enqueue(event="user_message", data={"i": i})
        await observer.flush()
        assert db.__aenter__.await_count == 1

        await observer.aclose()
        assert db.__aexit__.await_count == 1

    @pytest.mark.asyncio
    async def test_client_is_reusable_across_calls(self):
        """A worker reuses one ZizkaDB client for many calls.

        ZizkaDB.__aexit__ closes the transport but leaves the closed client
        assigned, so the observer must clear it or the next call's events are all
        dropped with "client has been closed".
        """
        db = _make_db()
        db._client = None
        db.__aenter__ = AsyncMock(side_effect=lambda: setattr(db, "_client", object()))
        db.__aexit__ = AsyncMock()  # closes the transport, leaves _client set

        for call in range(2):
            observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id=f"c{call}")
            observer.enqueue(event="user_message", data={"call": call})
            await observer.flush()
            await observer.aclose()
            assert db._client is None, "closed client left assigned; next call breaks"

        assert db.log.await_count == 2

    @pytest.mark.asyncio
    async def test_caller_managed_client_is_left_alone(self):
        db = _make_db()
        db._client = object()  # caller already inside `async with ZizkaDB(...)`
        db.__aenter__ = AsyncMock()
        db.__aexit__ = AsyncMock()

        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="s1")
        observer.enqueue(event="user_message", data={})
        await observer.flush()
        await observer.aclose()

        db.__aenter__.assert_not_awaited()
        db.__aexit__.assert_not_awaited()


class TestRegistryBounds:
    def test_registry_evicts_when_sessions_are_never_popped(self):
        """A killed worker never runs on_session_end; the registry must not grow."""
        from zizkadb_livekit.registry import MAX_TRACKED_SESSIONS, _OBSERVERS

        db = _make_db()
        before = len(_OBSERVERS)
        for i in range(MAX_TRACKED_SESSIONS + 50):
            register_observer(
                _ctx(f"leak-{i}"),
                ZizkaDBLiveKitObserver(db, agent="voice", session_id=f"s{i}"),
            )
        assert len(_OBSERVERS) <= MAX_TRACKED_SESSIONS
        # The most recent registration is still retrievable.
        assert get_observer(_ctx(f"leak-{MAX_TRACKED_SESSIONS + 49}")) is not None
        for i in range(MAX_TRACKED_SESSIONS + 50):
            pop_observer(_ctx(f"leak-{i}"))
        assert len(_OBSERVERS) == before
