"""Resolve ISO 3166-1 alpha-2 country codes from HTTP requests (no raw IP stored)."""

from __future__ import annotations

import ipaddress
import logging
import os
from functools import lru_cache
from pathlib import Path

from fastapi import Request

from api.utils import client_ip

log = logging.getLogger(__name__)

_COUNTRY_HEADERS = (
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
    "cloudfront-viewer-country",
)


def _is_private_or_local_ip(ip: str) -> bool:
    if not ip or ip == "unknown":
        return True
    try:
        addr = ipaddress.ip_address(ip.split("%")[0])
        return addr.is_private or addr.is_loopback or addr.is_link_local
    except ValueError:
        return True


@lru_cache(maxsize=1)
def _geoip_reader():
    path = (os.getenv("GEOIP_COUNTRY_DB_PATH") or "").strip()
    if not path or not Path(path).is_file():
        return None
    try:
        import geoip2.database

        return geoip2.database.Reader(path)
    except Exception as exc:
        log.warning("GeoIP database unavailable at %s: %s", path, exc)
        return None


def country_code_from_ip(ip: str) -> str | None:
    if _is_private_or_local_ip(ip):
        return None
    reader = _geoip_reader()
    if not reader:
        return None
    try:
        return reader.country(ip).country.iso_code
    except Exception:
        return None


def country_code_from_request(request: Request) -> str | None:
    for header in _COUNTRY_HEADERS:
        raw = request.headers.get(header)
        if not raw:
            continue
        code = raw.strip().upper()
        if len(code) == 2 and code not in ("XX", "T1"):
            return code

    return country_code_from_ip(client_ip(request))
