"""Shared helpers reused across public API endpoints."""

from __future__ import annotations

import os
import time

from fastapi import HTTPException, Request

# X-Forwarded-For is only trusted when the direct TCP connection comes from a
# known reverse proxy — otherwise any client can forge the header to spoof
# their IP and dodge rate limiting. In Docker Compose, nginx/the dashboard
# connect over the bridge network, not 127.0.0.1, so operators fronting the
# API with a proxy on another host/IP must set TRUSTED_PROXY_IPS.
_TRUSTED_PROXIES = {
    "127.0.0.1",
    "::1",
    *(ip.strip() for ip in os.getenv("TRUSTED_PROXY_IPS", "").split(",") if ip.strip()),
}


def client_ip(request: Request) -> str:
    direct_ip = request.client.host if request.client else None
    if direct_ip in _TRUSTED_PROXIES:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return direct_ip or "unknown"


def check_rate(
    store: dict[str, list[float]],
    ip: str,
    window_sec: int,
    max_hits: int,
    detail: str = "Too many requests. Try again later.",
) -> None:
    now = time.time()
    hits = [t for t in store.get(ip, []) if now - t < window_sec]
    if len(hits) >= max_hits:
        raise HTTPException(status_code=429, detail=detail)
    hits.append(now)
    store[ip] = hits
