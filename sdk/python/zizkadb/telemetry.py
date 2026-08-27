"""
Anonymous install telemetry for the ZizkaDB Python SDK.

One ping per process when the client is constructed — install adoption, not usage.
install_id is stable per machine (~/.zizkadb/install_id).

Self-hosted (localhost Docker) installs are counted with mode=self-hosted.

What is NOT sent: API keys, agent names, event data, IP address, hostname.

Opt out: export ZIZKADB_TELEMETRY=false
"""

from __future__ import annotations

import json
import os
import platform
import sys
import threading
import urllib.request

from .install_id import get_or_create_install_id

_TELEMETRY_URL = "https://db.zizka.ai/v1/telemetry"
_sent = False  # once per process


def _sdk_version() -> str:
    try:
        from zizkadb import __version__

        return __version__
    except Exception:
        return "unknown"


def _send(mode: str) -> None:
    payload = json.dumps(
        {
            "install_id": get_or_create_install_id(),
            "sdk": "python",
            "sdk_version": _sdk_version(),
            "python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
            "os": platform.system(),
            "mode": mode,
        }
    ).encode()

    req = urllib.request.Request(
        _TELEMETRY_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    urllib.request.urlopen(req, timeout=2)


def ping_on_install(mode: str = "cloud") -> None:
    """Fire-and-forget: one install ping per process when ZizkaDB() is constructed."""
    global _sent
    if _sent:
        return
    if os.getenv("ZIZKADB_TELEMETRY", "").lower() in ("false", "0", "no", "off"):
        return
    _sent = True

    def _run() -> None:
        try:
            _send(mode)
        except Exception:
            pass

    threading.Thread(target=_run, daemon=True).start()


def ping_on_use(mode: str = "cloud") -> None:
    """Back-compat alias — install is counted at construct time, not on log()."""
    ping_on_install(mode)


def ping(mode: str = "cloud") -> None:
    """Back-compat alias for ping_on_install."""
    ping_on_install(mode)
