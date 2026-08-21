"""Stable anonymous install_id — one UUID per machine when possible."""

from __future__ import annotations

import platform
import uuid
from pathlib import Path

_INSTALL_DIR = Path.home() / ".zizkadb"
_INSTALL_ID_PATH = _INSTALL_DIR / "install_id"


def _machine_stable_uuid() -> str:
    """Deterministic id when ~/.zizkadb is not writable (CI/Docker)."""
    for path in (Path("/etc/machine-id"), Path("/var/lib/dbus/machine-id")):
        try:
            raw = path.read_text().strip()
            if raw:
                return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"zizkadb:{raw}"))
        except OSError:
            continue
    seed = f"{platform.node()}:{platform.system()}:{platform.machine()}"
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"zizkadb:{seed}"))


def get_or_create_install_id() -> str:
    try:
        _INSTALL_DIR.mkdir(parents=True, exist_ok=True)
        if _INSTALL_ID_PATH.exists():
            iid = _INSTALL_ID_PATH.read_text().strip()
            if iid:
                return iid
        iid = str(uuid.uuid4())
        _INSTALL_ID_PATH.write_text(iid)
        return iid
    except OSError:
        return _machine_stable_uuid()
