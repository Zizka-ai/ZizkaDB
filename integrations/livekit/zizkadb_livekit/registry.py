"""Per-JobContext observer lookup.

``on_session_end`` receives the same ``JobContext`` object as the entrypoint, so
the observer for a call can be stashed against that context. A worker handles
many calls concurrently; a module-level observer would let them overwrite each
other's transcripts.

Entries are normally removed by ``pop_observer`` in ``on_session_end``. That
callback is not guaranteed to run — a worker can be killed mid-call — so the
registry is also bounded: registering past ``MAX_TRACKED_SESSIONS`` evicts the
oldest entry, which keeps a long-lived worker from leaking one observer per call.
"""

from __future__ import annotations

from collections import OrderedDict
from typing import Any

# Generous next to any realistic per-worker concurrency, so eviction only ever
# reclaims contexts whose on_session_end never fired.
MAX_TRACKED_SESSIONS = 1024

_OBSERVERS: "OrderedDict[str, Any]" = OrderedDict()


def _ctx_key(ctx: Any) -> str:
    """Prefer the LiveKit job id: stable, loggable, and not reused after GC."""
    job = getattr(ctx, "job", None)
    job_id = getattr(job, "id", None) if job is not None else None
    if job_id:
        return str(job_id)
    return f"ctx-{id(ctx)}"


def register_observer(ctx: Any, observer: Any) -> None:
    key = _ctx_key(ctx)
    _OBSERVERS[key] = observer
    _OBSERVERS.move_to_end(key)
    while len(_OBSERVERS) > MAX_TRACKED_SESSIONS:
        _OBSERVERS.popitem(last=False)


def get_observer(ctx: Any) -> Any | None:
    return _OBSERVERS.get(_ctx_key(ctx))


def pop_observer(ctx: Any) -> Any | None:
    return _OBSERVERS.pop(_ctx_key(ctx), None)
