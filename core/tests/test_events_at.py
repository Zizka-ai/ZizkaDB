"""Tests for GET /v1/events/at row cap."""

import datetime
from unittest.mock import AsyncMock

import pytest

from api.events import time_travel, _events_at_max_rows


FULL_TENANT = {"tenant_id": "t-1"}


@pytest.mark.asyncio
async def test_events_at_respects_max_row_limit(monkeypatch):
    pool = AsyncMock()
    ts = datetime.datetime(2024, 6, 1, tzinfo=datetime.timezone.utc)
    max_rows = _events_at_max_rows()
    rows = [
        {
            "event_id": f"00000000-0000-0000-0000-{i:012d}",
            "agent_id": "agent1",
            "timestamp": ts,
            "event_type": "STATE_SET",
            "data": {"key": f"v{i}"},
            "parent_event_id": None,
            "session_id": None,
            "sequence_no": i,
            "metadata": None,
        }
        for i in range(max_rows + 1)
    ]
    pool.fetch = AsyncMock(return_value=rows)
    monkeypatch.setattr("api.events.get_pool", lambda: pool)
    monkeypatch.setattr("api.events.assert_agent_allowed", AsyncMock())

    result = await time_travel("agent1", ts, tenant=FULL_TENANT)

    assert result["truncated"] is True
    assert result["event_count"] == max_rows
    assert result["max_rows"] == max_rows

    sql = pool.fetch.await_args.args[0]
    assert "LIMIT" in sql
