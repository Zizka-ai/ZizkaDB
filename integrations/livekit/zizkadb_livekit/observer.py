"""
LiveKit Agents → ZizkaDB observer.

Maps each voice call to one ZizkaDB session (session_id) and logs transcript
turns plus backend events. Transcript text is copied from LiveKit's session
report — ZizkaDB does not record or store audio.
"""

from __future__ import annotations

import logging
from typing import Any, Callable

from zizkadb import ZizkaDB
from zizkadb.models import LogResult

from ._report import (
    backend_events,
    chat_items,
    item_role,
    item_text,
    normalize_report,
    zizka_event_for_report_event,
    zizka_event_for_role,
)

log = logging.getLogger(__name__)

SessionIdFactory = Callable[[Any], str]


class ZizkaDBLiveKitObserver:
    """
    Log LiveKit voice calls to ZizkaDB using the same Activity model as text agents:
    one session_id per call, transcript as user_message / assistant_response events.

    Usage:
        db = ZizkaDB(host="http://localhost:8000")
        observer = ZizkaDBLiveKitObserver(db, agent="voice-support", session_id=ctx.room.name)
        await observer.log_session_started(room=ctx.room.name, job_id=ctx.job.id)
        observer.attach(session)  # optional realtime turns
        # in on_session_end:
        await observer.ingest_session_report(ctx)
    """

    def __init__(
        self,
        db: ZizkaDB,
        agent: str,
        session_id: str,
        *,
        session_id_from: SessionIdFactory | None = None,
    ) -> None:
        self.db = db
        self.agent = agent
        self.session_id = session_id
        self.session_id_from = session_id_from
        self.last_event_id: str | None = None
        self._seen_item_ids: set[str] = set()
        self._session_started = False
        self._session_ended = False
        self._realtime_attached = False
        self._last_result: LogResult | None = None
        self._report_ingested = False

    async def log_session_started(
        self,
        *,
        room: str | None = None,
        job_id: str | None = None,
        **extra: Any,
    ) -> LogResult:
        if self._session_started:
            assert self._last_result is not None
            return self._last_result
        data: dict[str, Any] = {"source": "livekit", **extra}
        if room is not None:
            data["room"] = room
        if job_id is not None:
            data["job_id"] = job_id
        result = await self._log(
            event="session_started",
            data=data,
            parent_id=None,
        )
        self._session_started = True
        return result

    async def log_session_ended(
        self,
        *,
        turn_count: int | None = None,
        duration_s: float | None = None,
        livekit_job_id: str | None = None,
        **extra: Any,
    ) -> LogResult:
        data: dict[str, Any] = {"source": "livekit", **extra}
        if turn_count is not None:
            data["turn_count"] = turn_count
        if duration_s is not None:
            data["duration_s"] = duration_s
        if livekit_job_id is not None:
            data["livekit_job_id"] = livekit_job_id
        result = await self._log(
            event="session_ended",
            data=data,
            parent_id=self.last_event_id,
        )
        self._session_ended = True
        return result

    def attach(self, session: Any, job_ctx: Any | None = None) -> None:
        if self._realtime_attached:
            return

        if job_ctx is not None and self.session_id_from is not None:
            self.session_id = self.session_id_from(job_ctx)

        def on_conversation_item_added(ev: Any) -> None:
            try:
                import asyncio

                asyncio.get_running_loop().create_task(self._on_conversation_item(ev))
            except RuntimeError:
                log.debug("conversation_item_added outside running loop; skipped")

        if hasattr(session, "on"):
            session.on("conversation_item_added", on_conversation_item_added)
        self._realtime_attached = True

    async def ingest_session_report(self, ctx: Any) -> list[LogResult]:
        make_report = getattr(ctx, "make_session_report", None)
        if make_report is None:
            raise TypeError("ctx must provide make_session_report() (LiveKit JobContext)")
        report = make_report()
        to_dict = getattr(report, "to_dict", None)
        if to_dict is None:
            raise TypeError("SessionReport must provide to_dict()")
        return await self.ingest_report(to_dict())

    async def ingest_report(self, report: dict[str, Any]) -> list[LogResult]:
        report = normalize_report(report)
        results: list[LogResult] = []
        backfill_only = self._report_ingested

        if not self._session_started:
            results.append(
                await self.log_session_started(
                    room=report.get("room"),
                    job_id=report.get("job_id"),
                    room_id=report.get("room_id"),
                )
            )

        for item in chat_items(report):
            item_id = item.get("id")
            if item_id and item_id in self._seen_item_ids:
                continue
            role = item_role(item)
            event_type = zizka_event_for_role(role)
            if event_type is None:
                continue
            text = item_text(item)
            if not text.strip():
                continue
            data: dict[str, Any] = {"content": text}
            if item.get("interrupted") is not None:
                data["interrupted"] = item["interrupted"]
            if item.get("created_at") is not None:
                data["created_at"] = item["created_at"]
            metadata = {"source": "livekit"}
            if item_id:
                metadata["livekit_item_id"] = item_id
            results.append(
                await self._log(
                    event=event_type,
                    data=data,
                    parent_id=self.last_event_id,
                    metadata=metadata,
                )
            )
            if item_id:
                self._seen_item_ids.add(item_id)

        if not backfill_only:
            for ev in backend_events(report):
                event_type = zizka_event_for_report_event(ev)
                ev_type = ev.get("type") or ev.get("event")
                data = {k: v for k, v in ev.items() if k not in ("type", "event")}
                if ev_type:
                    data["livekit_type"] = ev_type
                results.append(
                    await self._log(
                        event=event_type,
                        data=data,
                        parent_id=self.last_event_id,
                        metadata={"source": "livekit", "livekit_event": True},
                    )
                )

            if not self._session_ended:
                results.append(
                    await self.log_session_ended(
                        turn_count=len(chat_items(report)),
                        livekit_job_id=report.get("job_id"),
                    )
                )

            self._report_ingested = True

        return results

    async def log_tool_call(
        self,
        tool: str,
        *,
        args: dict[str, Any] | None = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult:
        data: dict[str, Any] = {"tool": tool, **extra}
        if args is not None:
            data["args"] = args
        return await self._log(
            event="tool_call",
            data=data,
            parent_id=parent_id or self.last_event_id,
        )

    async def log_tool_result(
        self,
        tool: str,
        *,
        output: Any = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult:
        data: dict[str, Any] = {"tool": tool, **extra}
        if output is not None:
            data["output"] = output
        return await self._log(
            event="tool_result",
            data=data,
            parent_id=parent_id or self.last_event_id,
        )

    async def log_error(
        self,
        message: str,
        *,
        stage: str | None = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult:
        data: dict[str, Any] = {"error": message, **extra}
        if stage is not None:
            data["stage"] = stage
        return await self._log(
            event="error",
            data=data,
            parent_id=parent_id or self.last_event_id,
        )

    async def _on_conversation_item(self, ev: Any) -> None:
        item = getattr(ev, "item", None)
        if item is None:
            return
        item_id = getattr(item, "id", None) or getattr(item, "item_id", None)
        if item_id is not None:
            item_id = str(item_id)
            if item_id in self._seen_item_ids:
                return
        role = item_role(
            {
                "role": getattr(item, "role", None),
                "content": getattr(item, "content", None),
            }
        )
        event_type = zizka_event_for_role(role)
        if event_type is None:
            return
        text = item_text({"content": getattr(item, "content", "")})
        if not text.strip():
            return
        metadata = {"source": "livekit", "realtime": True}
        if item_id:
            metadata["livekit_item_id"] = item_id
        await self._log(
            event=event_type,
            data={"content": text},
            parent_id=self.last_event_id,
            metadata=metadata,
        )
        if item_id:
            self._seen_item_ids.add(item_id)

    async def _log(
        self,
        *,
        event: str,
        data: dict[str, Any],
        parent_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> LogResult:
        result = await self.db.log(
            agent=self.agent,
            event=event,
            data=data,
            parent_id=parent_id,
            session_id=self.session_id,
            metadata=metadata,
        )
        self.last_event_id = result.event_id
        self._last_result = result
        return result
