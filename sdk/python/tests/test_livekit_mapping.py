"""Event/chat-item mapping, verbosity tiers and payload summarization.

Guards the two defects found by replaying a real LiveKit 1.7.1 session through
the parser: every backend event collapsed to ``livekit_event``, and non-message
chat items (``agent_handoff``) were dropped entirely.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from zizkadb_livekit._report import (
    chat_items,
    event_allowed,
    resolve_level,
    summarize_event_data,
    zizka_event_for_item,
    zizka_event_for_report_event,
)

FIXTURE = Path(__file__).parent / "fixtures" / "livekit_session_report.json"


def _fixture() -> dict:
    return json.loads(FIXTURE.read_text())


# Every public LiveKit EventTypes literal, plus the two that bypass session.emit()
# and can only be captured live (eot_prediction, user_turn_exceeded).
EXPECTED_EVENT_MAP = [
    ("user_state_changed", "user_state_changed"),
    ("agent_state_changed", "agent_state_changed"),
    ("user_transcription_timeout", "transcription_timeout"),
    ("conversation_item_added", None),  # chat_history already covers it
    ("agent_false_interruption", "false_interruption"),
    ("overlapping_speech", "overlapping_speech"),
    ("function_tools_executed", "tool_result"),
    ("session_usage_updated", "usage_updated"),
    ("speech_created", "speech_created"),
    ("tool_execution_updated", "tool_progress"),
    ("error", "error"),
    ("close", "session_closing"),
    ("debug_message", "debug_message"),
    ("eot_prediction", "eot_prediction"),
    ("user_turn_exceeded", "user_turn_exceeded"),
]


class TestEventMapping:
    @pytest.mark.parametrize(("livekit_type", "expected"), EXPECTED_EVENT_MAP)
    def test_event_mapping_table(self, livekit_type, expected):
        assert zizka_event_for_report_event({"type": livekit_type}) == expected

    def test_final_and_partial_transcripts_differ(self):
        final = {"type": "user_input_transcribed", "transcript": "hi", "is_final": True}
        partial = {"type": "user_input_transcribed", "transcript": "h", "is_final": False}
        assert zizka_event_for_report_event(final) == "user_transcript"
        assert zizka_event_for_report_event(partial) == "user_transcript_partial"

    def test_unknown_type_falls_back(self):
        assert zizka_event_for_report_event({"type": "some_future_event"}) == "livekit_event"

    def test_no_event_maps_to_generic_livekit_event(self):
        """Replay of a real captured session must produce zero generic rows."""
        report = _fixture()
        generic = [
            e["type"]
            for e in report["events"]
            if zizka_event_for_report_event(e) == "livekit_event"
        ]
        assert generic == [], f"unmapped LiveKit event types: {sorted(set(generic))}"


class TestChatItemMapping:
    def test_agent_handoff_item_is_mapped(self):
        item = {"type": "agent_handoff", "new_agent_id": "assistant"}
        assert zizka_event_for_item(item) == "agent_handoff"

    def test_agent_config_update_item_is_mapped(self):
        assert zizka_event_for_item({"type": "agent_config_update"}) == "agent_config_update"

    def test_message_items_still_map_by_role(self):
        assert zizka_event_for_item({"type": "message", "role": "user"}) == "user_message"
        assert (
            zizka_event_for_item({"type": "message", "role": "assistant"})
            == "assistant_response"
        )

    def test_role_only_item_without_type_still_works(self):
        """Older/synthetic reports omit `type`; must not regress."""
        assert zizka_event_for_item({"role": "user"}) == "user_message"

    def test_function_call_items_are_mapped(self):
        assert zizka_event_for_item({"type": "function_call"}) == "tool_call"
        assert zizka_event_for_item({"type": "function_call_output"}) == "tool_result"

    def test_no_real_chat_item_is_dropped(self):
        """The agent_handoff drop defect, guarded against real captured data."""
        report = _fixture()
        dropped = [
            it.get("type")
            for it in chat_items(report)
            if zizka_event_for_item(it) is None
        ]
        assert dropped == [], f"dropped chat item types: {sorted(set(dropped))}"


class TestTiers:
    def test_transcript_level_excludes_state_changes(self):
        assert event_allowed("user_message", "transcript") is True
        assert event_allowed("agent_state_changed", "transcript") is False

    def test_standard_includes_state_but_not_partials(self):
        assert event_allowed("agent_state_changed", "standard") is True
        assert event_allowed("user_transcript_partial", "standard") is False
        assert event_allowed("eot_prediction", "standard") is False

    def test_verbose_includes_everything(self):
        for ev in ("user_message", "agent_state_changed", "eot_prediction", "debug_message"):
            assert event_allowed(ev, "verbose") is True

    def test_errors_and_lifecycle_always_allowed(self):
        for ev in ("error", "session_started", "session_ended"):
            assert event_allowed(ev, "transcript") is True

    def test_resolve_level_default_and_env(self, monkeypatch):
        monkeypatch.delenv("ZIZKADB_EVENT_LEVEL", raising=False)
        assert resolve_level() == "standard"
        monkeypatch.setenv("ZIZKADB_EVENT_LEVEL", "verbose")
        assert resolve_level() == "verbose"
        assert resolve_level("transcript") == "transcript"

    def test_resolve_level_unknown_falls_back(self, monkeypatch):
        monkeypatch.setenv("ZIZKADB_EVENT_LEVEL", "nonsense")
        assert resolve_level() == "standard"


class TestSummarize:
    def test_state_change_data_is_summarized(self):
        ev = {
            "type": "agent_state_changed",
            "old_state": "listening",
            "new_state": "speaking",
            "created_at": 1.0,
        }
        data = summarize_event_data("agent_state_changed", ev, level="standard")
        assert data["from"] == "listening"
        assert data["to"] == "speaking"
        assert "raw" not in data

    def test_raw_kept_only_at_verbose(self):
        ev = {"type": "agent_state_changed", "old_state": "a", "new_state": "b"}
        assert "raw" not in summarize_event_data("agent_state_changed", ev, level="standard")
        assert "raw" in summarize_event_data("agent_state_changed", ev, level="verbose")

    def test_transcript_summary_leads_with_content(self):
        ev = {
            "type": "user_input_transcribed",
            "transcript": "hello world",
            "is_final": True,
            "language": "en",
        }
        data = summarize_event_data("user_transcript", ev, level="standard")
        assert data["content"] == "hello world"

    def test_eot_prediction_summary(self):
        ev = {"type": "eot_prediction", "probability": 0.01, "threshold": 0.56}
        data = summarize_event_data("eot_prediction", ev, level="standard")
        assert data["probability"] == 0.01
        assert data["threshold"] == 0.56

    def test_summary_is_short_enough_for_dashboard(self):
        """Dashboard previews JSON.stringify(data).slice(0, 90)."""
        report = _fixture()
        for ev in report["events"]:
            zt = zizka_event_for_report_event(ev)
            if zt is None:
                continue
            data = summarize_event_data(zt, ev, level="standard")
            rendered = json.dumps(data)
            assert len(rendered) <= 200, f"{zt} summary too long: {rendered[:120]}"


class TestVerboseRawBounds:
    """`raw` copies third-party model_dump() output; its shape is not ours to trust."""

    def test_cyclic_payload_does_not_recurse_forever(self):
        ev: dict = {"type": "agent_state_changed"}
        ev["self"] = ev  # a self-referential model_dump
        data = summarize_event_data("agent_state_changed", ev, level="verbose")
        assert "raw" in data

    def test_deeply_nested_payload_is_depth_capped(self):
        deep: dict = {"leaf": 1}
        for _ in range(50):
            deep = {"nested": deep}
        ev = {"type": "agent_state_changed", "payload": deep}
        data = summarize_event_data("agent_state_changed", ev, level="verbose")
        rendered = json.dumps(data)
        assert '"nested"' in rendered

    def test_long_lists_are_truncated(self):
        ev = {"type": "agent_state_changed", "frames": list(range(5000))}
        data = summarize_event_data("agent_state_changed", ev, level="verbose")
        assert len(data["raw"]["frames"]) <= 50

    def test_long_scalars_are_truncated(self):
        class Blob:
            def __str__(self) -> str:
                return "x" * 10_000

        ev = {"type": "agent_state_changed", "blob": Blob()}
        data = summarize_event_data("agent_state_changed", ev, level="verbose")
        assert len(data["raw"]["blob"]) < 600
