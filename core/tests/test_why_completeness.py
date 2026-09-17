"""Tests for why() chain completeness metadata."""

from services.why_analysis import analyze_why_chain


def test_orphan_mid_chain():
    meta = analyze_why_chain(
        anchor_event_type="tool_call",
        anchor_parent_id=None,
        chain_length=1,
        depth_limit=10,
        root_event_type="tool_call",
        root_has_parent=False,
        scoped_agent=None,
        chain_agents={"bot"},
    )
    assert meta["orphan"] is True
    assert meta["chain_complete"] is False


def test_complete_chain():
    meta = analyze_why_chain(
        anchor_event_type="tool_call",
        anchor_parent_id="parent-1",
        chain_length=3,
        depth_limit=10,
        root_event_type="user_message",
        root_has_parent=False,
        scoped_agent=None,
        chain_agents={"bot"},
    )
    assert meta["chain_complete"] is True
    assert meta["orphan"] is False


def test_depth_truncated():
    meta = analyze_why_chain(
        anchor_event_type="tool_call",
        anchor_parent_id="p1",
        chain_length=10,
        depth_limit=10,
        root_event_type="llm_end",
        root_has_parent=True,
        scoped_agent=None,
        chain_agents={"bot"},
    )
    assert meta["depth_truncated"] is True
