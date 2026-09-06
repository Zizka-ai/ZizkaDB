# ADR-005: In-Process Python Dict Rate Limiting

**Status**: Accepted (with known limitations); **OTP path updated 2026** — `POST /v1/auth/request-otp` uses Redis via `OTP_RATE_LIMIT_STORAGE` / `ENV=production` default (see `core/api/auth.py`). **Suggestions path updated 2026** — `GET /v1/agents/{id}/suggestions` uses Redis via `SUGGESTIONS_RATE_LIMIT_STORAGE` / `ENV=production` default with fail-open in-memory fallback (see `core/api/agents.py`). Other in-process limiters may still apply where those routes exist.  
**Date**: 2024 (OTP Redis note: 2026)

---

## Context

Several public API routes need rate limiting to prevent abuse:
- `POST /v1/community/posts` — community board
- `POST /v1/community/replies` — community board
- `POST /v1/community/upload` — file uploads
- `POST /v1/demo-requests` — landing lead form
- `POST /v1/marketing-subscriptions` — email signups
- `POST /v1/auth/request-otp` — OTP login (brute-force protection) — **see critical note below**

Options for implementation:
1. Redis-backed rate limiting (e.g., sliding window with `INCR`/`EXPIRE`)
2. In-process Python dict (keyed by IP or email)
3. Nginx rate limiting at the reverse proxy layer
4. A third-party rate limiting service

---

## Decision

Use **in-process Python dicts** for all rate limiting. The shared implementation lives in `core/api/utils.py`:

```python
def check_rate(key: str, store: dict, limit: int, window_seconds: int) -> bool:
    """Returns True if the request is allowed, False if rate limited."""
    now = time.time()
    timestamps = store.get(key, [])
    timestamps = [t for t in timestamps if now - t < window_seconds]
    if len(timestamps) >= limit:
        return False
    timestamps.append(now)
    store[key] = timestamps
    return True
```

Each route module holds its own `store` dict as a module-level variable. Rate limit windows and limits are defined per-route.

---

## Consequences

**Better:**
- Zero dependencies — no Redis connection needed just for rate limiting
- Zero latency overhead — no network call per request
- Simple to understand, test, and change
- Works correctly in a single-worker deployment

**Known limitations:**
- **State resets on restart**: all rate limit counters are lost when the API process restarts. A burst of requests can slip through during deploys.
- **Doesn't scale across workers**: production runs with `--workers 4` (4 uvicorn processes). Each worker has independent in-process state. A user can make 4× the intended rate limit by hitting different workers.
- **Memory grows unbounded for long-running processes**: old timestamps are cleaned up on each request for that key, but keys are never evicted from the dict. For low-traffic routes (demo requests, subscriptions) this is negligible; for high-traffic routes this could matter.

**Why accepted despite limitations — with one important exception:**
The marketing and community routes are low-traffic surfaces; burst requests slipping through (extra demo form submissions, extra community posts) are tolerable.

**The OTP route is different.** `POST /v1/auth/request-otp` uses Redis when `ENV=production` or `OTP_RATE_LIMIT_STORAGE=redis` (see `core/api/auth.py`). Community, demo, and other `check_rate()` stores remain in-process and still multiply by uvicorn `--workers` (4× in production compose).

**Current state (2026-08):** OTP brute-force protection is Redis-backed in production. Do not assume every limiter is Redis — in-process `check_rate()` is unchanged.

**Current state (2026-09):** Suggestions throttle (`GET /v1/agents/{id}/suggestions`) is Redis-backed in production with fail-open fallback to per-worker in-memory limits when Redis is unavailable. OTP fails closed on Redis outage; suggestions fail open so the endpoint stays available at reduced coordination.

**Current state (2026-09):** Public demo-request and community rate limits use Redis with the same fail-open in-memory fallback. Marketing subscriptions still use Redis-only (no fallback yet).

---

## Future path

When the production stack runs multiple API instances (not just multiple workers on one instance), replace `check_rate()` with a Redis sliding window implementation using the existing Redis connection (`core/db/connection.py::get_redis()`). The interface of `check_rate()` is designed to be drop-in replaceable — all call sites pass a `store` argument, which can be replaced with a Redis client without changing the call sites.

---

## Alternatives considered

**Redis-backed sliding window**: correct at scale, but adds a Redis call per rate-limited request; overkill for current traffic.

**Nginx rate limiting**: works at the proxy layer (before the app), but can't use application-level keys (email, tenant ID) — only IP. Also requires nginx config changes for every new rate-limited route.

**Third-party service (Upstash, etc.)**: adds a paid external dependency for a feature that works well enough in-process at current scale.
