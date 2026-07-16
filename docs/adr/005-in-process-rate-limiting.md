# ADR-005: In-Process Python Dict Rate Limiting

**Status**: Accepted (with known limitations)  
**Date**: 2024

---

## Context

Several public API routes need rate limiting to prevent abuse:
- `POST /v1/community/posts` — community board
- `POST /v1/community/replies` — community board
- `POST /v1/community/upload` — file uploads
- `POST /v1/demo-requests` — enterprise lead form
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

**The OTP route is different and this decision does NOT apply to it.** `POST /v1/auth/request-otp` uses a separate `_otp_rate` dict in `core/api/auth.py` (not the shared `check_rate()` util) with a 10-attempt / 15-minute limit. With 4 uvicorn workers, the real limit is 40 attempts per 15 minutes per email — weakening the brute-force protection for a 6-digit OTP (900,000 possible values) to a material degree. The OTP rate limiter **must** be migrated to Redis before horizontal scaling or any public multi-tenant deployment.

---

## Future path

When the production stack runs multiple API instances (not just multiple workers on one instance), replace `check_rate()` with a Redis sliding window implementation using the existing Redis connection (`core/db/connection.py::get_redis()`). The interface of `check_rate()` is designed to be drop-in replaceable — all call sites pass a `store` argument, which can be replaced with a Redis client without changing the call sites.

---

## Alternatives considered

**Redis-backed sliding window**: correct at scale, but adds a Redis call per rate-limited request; overkill for current traffic.

**Nginx rate limiting**: works at the proxy layer (before the app), but can't use application-level keys (email, tenant ID) — only IP. Also requires nginx config changes for every new rate-limited route.

**Third-party service (Upstash, etc.)**: adds a paid external dependency for a feature that works well enough in-process at current scale.
