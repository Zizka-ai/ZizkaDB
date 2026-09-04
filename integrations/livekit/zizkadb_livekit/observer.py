"""
LiveKit Agents → ZizkaDB observer.

Maps each voice call to one ZizkaDB session (session_id) and logs transcript
turns plus pipeline events. Transcript text comes from LiveKit's chat history —
ZizkaDB does not record or store audio.

Two properties matter for voice:

* **Nothing blocks the call.** Writes go onto a bounded in-process queue drained
  by a single background task, so no HTTP round trip ever sits on the audio path.
  The queue drops its oldest entry when full rather than growing without limit.
* **Nothing propagates into the call.** Every background and callback path
  swallows exceptions with a warning. A ZizkaDB outage degrades observability,
  never the conversation.

The ``parent_id`` chain is what ``why()`` walks, so it must stay a single strand.
The background writer and ``ingest_report`` (which writes directly) both
read-modify-write the chain head, so every write holds ``_chain_lock`` across its
round trip; without it the two interleave into parallel strands. See ``_log``.

The observer also keeps one keep-alive HTTP connection open for the call instead
of letting the client open one per event — see ``_ensure_pooled``.

Most events are recovered from the end-of-session report. Two —
``eot_prediction`` and ``user_turn_exceeded`` — never pass through
``AgentSession.emit()`` and so never appear in that report; they are only
available from the live event stream, which is why ``attach()`` subscribes
broadly rather than to transcript turns alone.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Callable

from zizkadb import ZizkaDB
from zizkadb.models import LogResult

from ._report import (
    backend_events,
    chat_items,
    event_allowed,
    event_key,
    item_role,
    item_text,
    normalize_report,
    resolve_level,
    summarize_event_data,
    summarize_item_data,
    zizka_event_for_item,
    zizka_event_for_report_event,
    zizka_event_for_role,
)

log = logging.getLogger(__name__)

SessionIdFactory = Callable[[Any], str]

# Public AgentSession events worth observing live. Most also arrive in the
# session report and are deduped on (type, created_at); the two marked
# "live-only" below cannot be recovered any other way.
LIVE_EVENT_TYPES = (
    "user_input_transcribed",
    "user_state_changed",
    "agent_state_changed",
    "user_transcription_timeout",
    "agent_false_interruption",
    "overlapping_speech",
    "function_tools_executed",
    "tool_execution_updated",
    "session_usage_updated",
    "speech_created",
    "error",
    "close",
    "eot_prediction",  # live-only
    "user_turn_exceeded",  # live-only
)

_QUEUE_MAXSIZE = 1000

# How long flush()/aclose() wait for the queue to drain, in seconds. Bounded so a
# ZizkaDB outage cannot hold a worker's shutdown path open.
DEFAULT_FLUSH_TIMEOUT = 10.0


class _Chain:
    """Sentinel: link this write to the chain head as of when it starts."""

    def __repr__(self) -> str:  # pragma: no cover - debugging aid
        return "<chain>"


_CHAIN: Any = _Chain()


class ZizkaDBLiveKitObserver:
    """
    Log LiveKit voice calls to ZizkaDB using the same Activity model as text
    agents: one session_id per call, transcript as user_message /
    assistant_response events.

    One observer per call. Register it against the JobContext (see
    ``registry``) rather than a module global: a worker runs many calls at once.

    Usage:
        # in the entrypoint
        db = ZizkaDB(api_key="zizkadb_live_...")
        observer = ZizkaDBLiveKitObserver(db, agent="voice-support", session_id=ctx.room.name)
        register_observer(ctx, observer)
        observer.attach(session, job_ctx=ctx)          # before session.start()
        observer.queue_session_started(room=ctx.room.name, job_id=ctx.job.id)

        # in on_session_end
        observer = pop_observer(ctx)
        try:
            await observer.ingest_session_report(ctx)
        finally:
            await observer.aclose()

    Args:
        db: ZizkaDB client. The observer holds one pooled connection open for the
            call unless ``pool_connections=False`` or the caller already manages
            the client with ``async with``.
        agent: ZizkaDB agent name; must match the API key's scope.
        session_id: One id per call — the LiveKit room name is a good choice.
        session_id_from: Derive ``session_id`` from the JobContext at attach time.
        level: ``transcript`` | ``standard`` | ``verbose``. Defaults to
            ``ZIZKADB_EVENT_LEVEL``, else ``standard``.
        on_error: Called with any exception the observer swallowed. Diagnostics
            only — errors are never raised into the call.
        flush_timeout: Seconds ``flush()``/``aclose()`` wait for the queue.
        pool_connections: Keep one HTTP connection for the call instead of one
            per event.
    """

    def __init__(
        self,
        db: ZizkaDB,
        agent: str,
        session_id: str,
        *,
        session_id_from: SessionIdFactory | None = None,
        level: str | None = None,
        on_error: Callable[[BaseException], None] | None = None,
        flush_timeout: float = DEFAULT_FLUSH_TIMEOUT,
        pool_connections: bool = True,
    ) -> None:
        self.db = db
        self.agent = agent
        self.session_id = session_id
        self.session_id_from = session_id_from
        self.level = resolve_level(level)
        self.on_error = on_error
        self.flush_timeout = flush_timeout
        self.last_event_id: str | None = None
        self._seen_item_ids: set[str] = set()
        self._seen_event_keys: set[tuple[str, float]] = set()
        self._session_started = False
        self._session_ended = False
        self._realtime_attached = False
        self._last_result: LogResult | None = None
        self._session_started_result: LogResult | None = None
        self._report_ingested = False
        self._queue: asyncio.Queue[dict[str, Any]] | None = None
        self._writer_task: asyncio.Task[None] | None = None
        self._closed = False
        # Created lazily: the observer is often constructed before the event loop
        # that will use it, and asyncio primitives bind to the running loop.
        self._chain_lock_obj: asyncio.Lock | None = None
        self._lock_loop: asyncio.AbstractEventLoop | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._pool_connections = pool_connections
        self._owns_db_session = False

    async def __aenter__(self) -> "ZizkaDBLiveKitObserver":
        return self

    async def __aexit__(self, *_exc: Any) -> None:
        await self.aclose()

    @property
    def _chain_lock(self) -> asyncio.Lock:
        """The write lock, bound to whichever loop is currently running.

        asyncio primitives attach to the loop that first blocks on them, so an
        observer reused across loops needs a fresh lock. Rebuilding is safe here
        because a loop change means the old loop — and anything that held the old
        lock — is gone.
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:  # pragma: no cover - _log is always awaited
            loop = None
        if self._chain_lock_obj is None or (
            loop is not None
            and self._lock_loop is not None
            and self._lock_loop is not loop
        ):
            self._chain_lock_obj = asyncio.Lock()
            self._lock_loop = loop
        return self._chain_lock_obj

    # ------------------------------------------------------------------
    # Session lifecycle
    # ------------------------------------------------------------------

    def queue_session_started(
        self,
        *,
        room: str | None = None,
        job_id: str | None = None,
        **extra: Any,
    ) -> None:
        """Queue the session_started event instead of awaiting it.

        Used at the top of a call, where nothing should wait on ZizkaDB.
        """
        if self._session_started:
            return
        data: dict[str, Any] = {"source": "livekit", **extra}
        if room is not None:
            data["room"] = room
        if job_id is not None:
            data["job_id"] = job_id
        self._session_started = True
        self.enqueue(event="session_started", data=data)

    async def log_session_started(
        self,
        *,
        room: str | None = None,
        job_id: str | None = None,
        **extra: Any,
    ) -> LogResult | None:
        if self._session_started:
            return self._session_started_result
        data: dict[str, Any] = {"source": "livekit", **extra}
        if room is not None:
            data["room"] = room
        if job_id is not None:
            data["job_id"] = job_id
        result = await self._log(event="session_started", data=data, parent_id=None)
        self._session_started = True
        self._session_started_result = result
        return result

    async def log_session_ended(
        self,
        *,
        turn_count: int | None = None,
        duration_s: float | None = None,
        livekit_job_id: str | None = None,
        **extra: Any,
    ) -> LogResult | None:
        data: dict[str, Any] = {"source": "livekit", **extra}
        if turn_count is not None:
            data["turn_count"] = turn_count
        if duration_s is not None:
            data["duration_s"] = duration_s
        if livekit_job_id is not None:
            data["livekit_job_id"] = livekit_job_id
        result = await self._log(
            event="session_ended", data=data, parent_id=_CHAIN
        )
        self._session_ended = True
        return result

    # ------------------------------------------------------------------
    # Live event stream
    # ------------------------------------------------------------------

    def attach(self, session: Any, job_ctx: Any | None = None) -> None:
        """Subscribe to the session's event stream. Never raises."""
        if self._realtime_attached:
            return

        if job_ctx is not None and self.session_id_from is not None:
            try:
                self.session_id = self.session_id_from(job_ctx)
            except Exception as exc:  # pragma: no cover - defensive
                self._warn("session_id_from failed", exc)

        on = getattr(session, "on", None)
        if on is None:
            self._realtime_attached = True
            return

        try:
            on("conversation_item_added", self._handle_conversation_item)
        except Exception as exc:
            self._warn("could not subscribe to conversation_item_added", exc)

        for name in LIVE_EVENT_TYPES:
            try:
                on(name, self._make_event_handler(name))
            except Exception as exc:
                # A LiveKit version that doesn't know this event: skip it.
                log.debug("zizkadb: could not subscribe to %s: %s", name, exc)

        self._realtime_attached = True

    def _make_event_handler(self, name: str) -> Callable[[Any], None]:
        def handler(ev: Any) -> None:
            try:
                payload = self._event_payload(ev, name)
                if payload is None:
                    return
                self._enqueue_event(payload)
            except Exception as exc:
                self._warn(f"live {name} handler failed", exc)

        return handler

    def _handle_conversation_item(self, ev: Any) -> None:
        try:
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
            metadata: dict[str, Any] = {"source": "livekit", "realtime": True}
            if item_id:
                metadata["livekit_item_id"] = item_id
                self._seen_item_ids.add(item_id)
            self.enqueue(
                event=event_type, data={"content": text}, metadata=metadata
            )
        except Exception as exc:
            self._warn("conversation_item_added handler failed", exc)

    def _event_payload(self, ev: Any, name: str) -> dict[str, Any] | None:
        """Coerce a LiveKit event object into a plain dict."""
        if isinstance(ev, dict):
            payload = dict(ev)
        else:
            dump = getattr(ev, "model_dump", None)
            if dump is None:
                return None
            payload = dump()
            if not isinstance(payload, dict):
                return None
        payload.setdefault("type", name)
        return payload

    def _enqueue_event(self, payload: dict[str, Any]) -> None:
        zizka_event = zizka_event_for_report_event(payload)
        if zizka_event is None or not event_allowed(zizka_event, self.level):
            return
        key = event_key(payload)
        if key is not None:
            if key in self._seen_event_keys:
                return
            self._seen_event_keys.add(key)
        self.enqueue(
            event=zizka_event,
            data=summarize_event_data(zizka_event, payload, level=self.level),
            metadata={"source": "livekit", "realtime": True},
        )

    # ------------------------------------------------------------------
    # Queue
    # ------------------------------------------------------------------

    def enqueue(
        self,
        *,
        event: str,
        data: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        """Queue an event for background writing. Never awaits, never raises."""
        if self._closed:
            return
        try:
            queue = self._ensure_writer()
            if queue is None:
                return
            item = {"event": event, "data": data, "metadata": metadata}
            try:
                queue.put_nowait(item)
            except asyncio.QueueFull:
                # Prefer recent events over a stalled backlog.
                try:
                    queue.get_nowait()
                    queue.task_done()
                except Exception:
                    pass
                try:
                    queue.put_nowait(item)
                except Exception as exc:  # pragma: no cover - defensive
                    self._warn("dropped event, queue full", exc)
        except Exception as exc:
            self._warn(f"could not queue {event}", exc)

    def _ensure_writer(self) -> asyncio.Queue[dict[str, Any]] | None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            log.debug("zizkadb: no running loop; event dropped")
            return None

        # asyncio.Queue and asyncio.Lock bind to the loop that first awaits them.
        # An observer reused across loops (tests, a worker restarting its loop)
        # would otherwise raise "bound to a different event loop" from inside the
        # writer task, where nothing retrieves the exception. Rebuild instead.
        if self._loop is not None and self._loop is not loop:
            log.debug("zizkadb: event loop changed; rebuilding writer")
            self._queue = None
            self._writer_task = None
        self._loop = loop

        if self._queue is None:
            self._queue = asyncio.Queue(maxsize=_QUEUE_MAXSIZE)
        if self._writer_task is None or self._writer_task.done():
            self._writer_task = asyncio.create_task(self._writer(self._queue))
        return self._queue

    async def _writer(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Drain the queue one event at a time.

        The queue is passed in rather than read from ``self`` so that a writer
        left over from a previous loop can never drain the current queue.
        """
        while True:
            item = await queue.get()
            try:
                await self._log(
                    event=item["event"],
                    data=item["data"],
                    parent_id=_CHAIN,
                    metadata=item.get("metadata"),
                )
            except asyncio.CancelledError:
                queue.task_done()
                raise
            except Exception as exc:
                self._warn(f"failed to log {item['event']}", exc)
            queue.task_done()

    async def flush(self, timeout: float | None = None) -> None:
        """Wait for queued events to be written. Never raises.

        Bounded by ``timeout`` (default: the observer's ``flush_timeout``) so a
        ZizkaDB outage cannot stall the caller.
        """
        queue = self._queue
        if queue is None:
            return
        try:
            await asyncio.wait_for(
                queue.join(),
                timeout=self.flush_timeout if timeout is None else timeout,
            )
        except asyncio.TimeoutError:
            self._warn("flush timed out", None)
        except asyncio.CancelledError:
            raise
        except Exception as exc:  # pragma: no cover - defensive
            self._warn("flush failed", exc)

    async def aclose(self, timeout: float | None = None) -> None:
        """Flush pending events and stop the writer. Idempotent; never raises."""
        # Close the door first: anything enqueued from here on would be orphaned
        # by the cancellation below rather than written.
        self._closed = True
        try:
            await self.flush(timeout=timeout)
            task = self._writer_task
            self._writer_task = None
            if task is not None and not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    # Ours if the task simply honoured the cancel; re-raise only
                    # when the caller is the one being cancelled, so aclose()
                    # stays interruptible rather than swallowing shutdown.
                    if not task.cancelled():
                        raise
                except Exception:  # pragma: no cover - defensive
                    log.debug("zizkadb: writer ended with an error", exc_info=True)
        finally:
            # Runs even if the caller is cancelled mid-close, so the pooled
            # connection is never left open.
            await self._close_pooled()

    # ------------------------------------------------------------------
    # Session report
    # ------------------------------------------------------------------

    async def ingest_session_report(self, ctx: Any) -> list[LogResult]:
        make_report = getattr(ctx, "make_session_report", None)
        if make_report is None:
            raise TypeError("ctx must provide make_session_report() (LiveKit JobContext)")
        try:
            report = make_report()
        except RuntimeError as exc:
            # Raised while the recorder is still running, or with no session.
            self._warn("could not build session report", exc)
            return []
        to_dict = getattr(report, "to_dict", None)
        if to_dict is None:
            raise TypeError("SessionReport must provide to_dict()")
        return await self.ingest_report(to_dict())

    async def ingest_report(self, report: dict[str, Any]) -> list[LogResult]:
        report = normalize_report(report)
        results: list[LogResult] = []
        backfill_only = self._report_ingested

        # Live turns first, so dedupe sees them before the backfill.
        await self.flush()

        if not self._session_started:
            try:
                started = await self.log_session_started(
                    room=report.get("room"),
                    job_id=report.get("job_id"),
                    room_id=report.get("room_id"),
                    sdk_version=report.get("sdk_version"),
                )
            except Exception as exc:
                self._warn("could not log session_started", exc)
            else:
                if started is not None:
                    results.append(started)

        items = chat_items(report)
        events = backend_events(report) if not backfill_only else []

        # Transcript turns and pipeline events are separate lists in the report
        # but interleave in time. Merge them so the dashboard, which orders by
        # sequence_no, reads in the order things actually happened.
        merged: list[tuple[float, str, dict[str, Any]]] = [
            (_row_time(item), "item", item) for item in items
        ]
        merged += [(_row_time(ev), "event", ev) for ev in events]
        merged.sort(key=lambda row: row[0])

        failures = 0
        for _, kind, row in merged:
            try:
                if kind == "item":
                    logged = await self._log_chat_item(row)
                else:
                    logged = await self._log_backend_event(row)
            except Exception as exc:
                failures += 1
                if failures == 1:
                    self._warn("session report ingest failing", exc)
                continue
            if logged is not None:
                results.append(logged)
        if failures:
            log.warning("zizkadb: %d session report events were not written", failures)

        if not backfill_only:

            if not self._session_ended:
                try:
                    ended = await self.log_session_ended(
                        turn_count=len(items),
                        duration_s=_report_duration(report, events),
                        livekit_job_id=report.get("job_id"),
                        usage=report.get("usage"),
                    )
                except Exception as exc:
                    self._warn("could not log session_ended", exc)
                else:
                    if ended is not None:
                        results.append(ended)

            self._report_ingested = True

        return results

    async def _log_chat_item(self, item: dict[str, Any]) -> LogResult | None:
        item_id = item.get("id")
        if item_id and item_id in self._seen_item_ids:
            return None
        event_type = zizka_event_for_item(item)
        if event_type is None or not event_allowed(event_type, self.level):
            return None
        data = summarize_item_data(event_type, item, level=self.level)
        if event_type in ("user_message", "assistant_response") and not str(
            data.get("content", "")
        ).strip():
            return None
        metadata: dict[str, Any] = {"source": "livekit"}
        if item_id:
            metadata["livekit_item_id"] = item_id
            self._seen_item_ids.add(item_id)
        return await self._log(
            event=event_type,
            data=data,
            parent_id=_CHAIN,
            metadata=metadata,
        )

    async def _log_backend_event(self, ev: dict[str, Any]) -> LogResult | None:
        event_type = zizka_event_for_report_event(ev)
        if event_type is None or not event_allowed(event_type, self.level):
            return None
        key = event_key(ev)
        if key is not None:
            if key in self._seen_event_keys:
                return None
            self._seen_event_keys.add(key)
        return await self._log(
            event=event_type,
            data=summarize_event_data(event_type, ev, level=self.level),
            parent_id=_CHAIN,
            metadata={"source": "livekit", "livekit_event": True},
        )

    # ------------------------------------------------------------------
    # Explicit helpers
    # ------------------------------------------------------------------

    async def log_tool_call(
        self,
        tool: str,
        *,
        args: dict[str, Any] | None = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult | None:
        data: dict[str, Any] = {"tool": tool, **extra}
        if args is not None:
            data["args"] = args
        return await self._log(
            event="tool_call", data=data, parent_id=parent_id if parent_id is not None else _CHAIN
        )

    async def log_tool_result(
        self,
        tool: str,
        *,
        output: Any = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult | None:
        data: dict[str, Any] = {"tool": tool, **extra}
        if output is not None:
            data["output"] = output
        return await self._log(
            event="tool_result", data=data, parent_id=parent_id if parent_id is not None else _CHAIN
        )

    async def log_error(
        self,
        message: str,
        *,
        stage: str | None = None,
        parent_id: str | None = None,
        **extra: Any,
    ) -> LogResult | None:
        data: dict[str, Any] = {"error": message, **extra}
        if stage is not None:
            data["stage"] = stage
        return await self._log(
            event="error", data=data, parent_id=parent_id if parent_id is not None else _CHAIN
        )

    # ------------------------------------------------------------------

    async def _log(
        self,
        *,
        event: str,
        data: dict[str, Any],
        parent_id: str | None,
        metadata: dict[str, Any] | None = None,
    ) -> LogResult | None:
        """Write one event, holding the chain lock across the round trip.

        ``last_event_id`` is a read-modify-write shared by the background writer
        and by ``ingest_report``, which writes directly. Without the lock the two
        interleave and the causal chain forks into parallel strands, which is
        exactly what ``why()`` reads.

        Pass ``parent_id=_CHAIN`` to mean "link to whatever the head is when this
        write actually starts"; resolving it inside the lock is what keeps the
        chain single-stranded. An explicit value (including ``None``, used to root
        ``session_started``) is honoured as given.
        """
        async with self._chain_lock:
            await self._ensure_pooled()
            if parent_id is _CHAIN:
                parent_id = self.last_event_id
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

    async def _ensure_pooled(self) -> None:
        """Hold one keep-alive HTTP connection for the whole call.

        ``ZizkaDB`` only pools when used as an async context manager; outside one
        it opens and tears down a connection per request. A voice call logs
        hundreds of events, so that is a TLS handshake per transcript turn. Enter
        the client once here and close it in ``aclose()`` — but only if we opened
        it, so a caller managing the client themselves is left alone.
        """
        if not self._pool_connections or self._owns_db_session:
            return
        if getattr(self.db, "_client", None) is not None:
            return  # caller already holds an open client
        aenter = getattr(self.db, "__aenter__", None)
        if aenter is None:  # pragma: no cover - non-ZizkaDB test double
            self._pool_connections = False
            return
        try:
            await aenter()
            self._owns_db_session = True
        except Exception as exc:  # pragma: no cover - defensive
            self._pool_connections = False
            self._warn("could not open pooled connection", exc)

    async def _close_pooled(self) -> None:
        """Release the connection this observer opened, leaving the client reusable.

        ``ZizkaDB.__aexit__`` closes the transport but leaves the closed client
        assigned, so a client shared across calls would hand the next observer a
        dead connection. Clear the attribute we set, so the client falls back to
        its normal per-request behaviour and a later call can pool again.
        """
        if not self._owns_db_session:
            return
        self._owns_db_session = False
        try:
            await self.db.__aexit__(None, None, None)
        except Exception:  # pragma: no cover - defensive
            log.debug("zizkadb: closing pooled connection failed", exc_info=True)
        finally:
            if getattr(self.db, "_client", None) is not None:
                try:
                    self.db._client = None
                except Exception:  # pragma: no cover - defensive
                    log.debug("zizkadb: could not reset client", exc_info=True)

    def _warn(self, message: str, exc: BaseException | None) -> None:
        if exc is None:
            log.warning("zizkadb: %s", message)
        else:
            log.warning("zizkadb: %s: %s", message, exc)
        if exc is not None and self.on_error is not None:
            try:
                self.on_error(exc)
            except Exception:  # pragma: no cover - defensive
                log.debug("zizkadb: on_error callback raised", exc_info=True)


def _row_time(row: dict[str, Any]) -> float:
    for key in ("created_at", "timestamp", "started_at"):
        val = row.get(key)
        if isinstance(val, (int, float)):
            return float(val)
    return 0.0


def _report_duration(
    report: dict[str, Any], events: list[dict[str, Any]]
) -> float | None:
    """SessionReport.to_dict() omits started_at/duration, so derive it."""
    end = report.get("timestamp")
    if not isinstance(end, (int, float)):
        return None
    starts = [
        e["created_at"]
        for e in events
        if isinstance(e.get("created_at"), (int, float))
    ]
    if not starts:
        return None
    duration = float(end) - float(min(starts))
    return duration if duration >= 0 else None
