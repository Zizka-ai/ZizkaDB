"""Tests for LiveKit session report → ZizkaDB observer (no LiveKit runtime)."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

import pytest

from zizkadb_livekit import ZizkaDBLiveKitObserver


def _make_db(event_ids: list[str] | None = None) -> MagicMock:
    ids = iter(event_ids or ["evt-1", "evt-2", "evt-3", "evt-4", "evt-5", "evt-6"])
    db = MagicMock()

    async def _log(**kwargs):
        result = MagicMock()
        result.event_id = next(ids)
        return result

    db.log = AsyncMock(side_effect=_log)
    return db


SAMPLE_REPORT = {
    "job_id": "job_abc",
    "room_id": "RM_xyz",
    "room": "support-room",
    "chat_history": {
        "items": [
            {
                "id": "turn-1",
                "role": "user",
                "content": "I need a refund for order 12345",
                "created_at": 1.0,
            },
            {
                "id": "turn-2",
                "role": "assistant",
                "content": "Your order is delayed, arriving in three days.",
                "created_at": 2.0,
            },
        ]
    },
    "events": [
        {
            "type": "function_tools_executed",
            "created_at": 1.5,
            "tool": "lookup_order",
            "args": {"order_id": "12345"},
        },
        {"type": "metrics_collected", "created_at": 1.6},
    ],
}


class TestIngestReport:
    @pytest.mark.asyncio
    async def test_logs_session_lifecycle_and_transcript(self):
        db = _make_db(["s", "u", "a", "t", "e"])
        observer = ZizkaDBLiveKitObserver(
            db, agent="voice-support", session_id="call_support-room"
        )
        results = await observer.ingest_report(SAMPLE_REPORT)

        assert len(results) == 5
        events = [c.kwargs["event"] for c in db.log.call_args_list]
        # Transcript turns and pipeline events are merged in timestamp order,
        # so the tool result (t=1.5) sits between the two turns (t=1.0, t=2.0).
        # function_tools_executed is a completion, hence tool_result.
        assert events == [
            "session_started",
            "user_message",
            "tool_result",
            "assistant_response",
            "session_ended",
        ]

    @pytest.mark.asyncio
    async def test_uses_same_session_id(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(
            db, agent="voice-support", session_id="call_RM_xyz"
        )
        await observer.ingest_report(SAMPLE_REPORT)

        for call in db.log.call_args_list:
            assert call.kwargs["session_id"] == "call_RM_xyz"
            assert call.kwargs["agent"] == "voice-support"

    @pytest.mark.asyncio
    async def test_transcript_verbatim_in_content(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="call_x")
        await observer.ingest_report(SAMPLE_REPORT)

        by_event = {c.kwargs["event"]: c.kwargs["data"] for c in db.log.call_args_list}
        assert by_event["user_message"]["content"] == "I need a refund for order 12345"
        assert "delayed" in by_event["assistant_response"]["content"]

    @pytest.mark.asyncio
    async def test_dedupes_chat_items_on_second_ingest(self):
        db = _make_db(["s", "u", "a", "e", "s2", "e2"])
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="call_x")
        await observer.ingest_report(SAMPLE_REPORT)
        first_count = db.log.call_count

        await observer.ingest_report(SAMPLE_REPORT)
        # session_started skipped; turns skipped; session_ended already set
        assert db.log.call_count == first_count

    @pytest.mark.asyncio
    async def test_parent_id_chains_sequentially(self):
        db = _make_db(["e1", "e2", "e3", "e4", "e5"])
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="call_x")
        await observer.ingest_report(SAMPLE_REPORT)

        calls = db.log.call_args_list
        assert calls[0].kwargs["parent_id"] is None  # session_started
        assert calls[1].kwargs["parent_id"] == "e1"
        assert calls[2].kwargs["parent_id"] == "e2"
        assert calls[3].kwargs["parent_id"] == "e3"

    @pytest.mark.asyncio
    async def test_skips_metrics_collected_events(self):
        db = _make_db()
        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="call_x")
        await observer.ingest_report(SAMPLE_REPORT)

        for call in db.log.call_args_list:
            assert call.kwargs["event"] != "metrics_collected"

    @pytest.mark.asyncio
    async def test_ingest_session_report_from_ctx(self):
        db = _make_db(["s", "u", "a", "e"])
        report = MagicMock()
        report.to_dict.return_value = {
            "job_id": "j1",
            "room": "r1",
            "chat_history": {"items": [{"id": "1", "role": "user", "content": "Hi"}]},
            "events": [],
        }
        ctx = MagicMock()
        ctx.make_session_report.return_value = report

        observer = ZizkaDBLiveKitObserver(db, agent="voice", session_id="call_r1")
        await observer.ingest_session_report(ctx)
        ctx.make_session_report.assert_called_once()
