"""Automatic CrewAI event logging via BaseEventListener."""

from __future__ import annotations

from typing import Any

from zizkadb import ZizkaDB
from zizkadb.integrations.crewai.logger import ZizkaDBCrewLogger

try:
    from crewai.utilities.events.base_event_listener import BaseEventListener
except ImportError:  # pragma: no cover - optional at install time
    BaseEventListener = object  # type: ignore[misc, assignment]


class ZizkaDBCrewAIListener(BaseEventListener):
    """
    Opt-in CrewAI listener — auto-logs kickoff, tasks, and crew completion.

    Usage:
        listener = ZizkaDBCrewAIListener(db, agent="research-crew")
        listener.attach(crew)
    """

    def __init__(self, db: ZizkaDB, agent: str, session_id: str | None = None) -> None:
        if BaseEventListener is object:
            raise ImportError("crewai is required — pip install zizkadb-crewai[crewai]")
        super().__init__()
        self._logger = ZizkaDBCrewLogger(db, agent=agent, session_id=session_id)

    def setup_listeners(self, crewai_event_bus: Any) -> None:
        @crewai_event_bus.on("crew_kickoff_started")
        def on_kickoff(source: Any, event: Any) -> None:
            import asyncio

            goal = getattr(event, "inputs", {}) or {}
            asyncio.create_task(
                self._logger.log_kickoff(goal=str(goal)[:2000])
            )

        @crewai_event_bus.on("task_started")
        def on_task_start(source: Any, event: Any) -> None:
            import asyncio

            desc = getattr(getattr(event, "task", None), "description", "") or ""
            asyncio.create_task(self._logger.log_task(description=str(desc)[:2000]))

        @crewai_event_bus.on("crew_kickoff_completed")
        def on_complete(source: Any, event: Any) -> None:
            import asyncio

            raw = getattr(event, "output", "") or ""
            asyncio.create_task(self._logger.log_output(str(raw)[:8000]))
