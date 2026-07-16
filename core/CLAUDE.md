# core/ — FastAPI Backend

See root [`CLAUDE.md`](../CLAUDE.md) for full project context. This file covers `core/`-specific conventions.

---

## Router map

All routers are mounted in `main.py` at `/v1/<prefix>`:

| File | Prefix | Auth type |
|---|---|---|
| `api/events.py` | `/v1/events` | `get_tenant` |
| `api/agents.py` | `/v1/agents` | mixed (see below) |
| `api/auth.py` | `/v1/auth` | mixed |
| `api/search.py` | `/v1/search` | `get_tenant` |
| `api/memory.py` | `/v1/memory` | `get_tenant` |
| `api/telemetry.py` | `/v1/telemetry` | `get_tenant` |
| `api/stats.py` | `/v1/stats` | `get_tenant` |
| `api/billing_checkout.py` | `/v1/billing` | `require_dashboard_session` |
| `api/community.py` | `/v1/community` | public + rate-limited |
| `api/demo_requests.py` | `/v1/demo-requests` | public + rate-limited |
| `api/marketing_subscriptions.py` | `/v1/marketing-subscriptions` | public + rate-limited |
| `api/settings.py` | `/v1/settings` | `require_dashboard_session` |
| `api/account.py` | `/v1/account` | `require_dashboard_session` |
| `api/admin.py` | `/v1/admin` | `require_admin` (hidden from schema) |

Swagger UI: `http://localhost:8000/swagger` · OpenAPI schema: `/openapi.json`

---

## Auth dependency decision tree

```
Is this route SDK-callable (agents logging events, querying data)?
  → Depends(get_tenant)            accepts API keys + JWTs

Is this route dashboard-only (manages keys, billing, user settings, destructive ops)?
  → Depends(require_dashboard_session)   JWT only, rejects API keys

Is this route per-agent analytics (stats, sessions, baseline, behavior-change, time-travel)?
  → Depends(get_tenant)  AND  assert_agent_allowed(tenant, agent_id)  at the top of the handler

Is this the admin panel?
  → require_admin  (checks FOUNDER_EMAIL env var)
```

All three dependency functions are in `api/deps.py`. `require_dashboard_session` is the pre-built instance of `dashboard_session_dependency()`.

---

## Database pattern

```python
from db.connection import get_pool

pool = get_pool()  # asyncpg.Pool — never create your own connection

async with pool.acquire() as conn:
    row = await conn.fetchrow("SELECT ...", arg1, arg2)

# Transactions (for multi-statement atomic ops):
async with pool.acquire() as conn:
    async with conn.transaction():
        await conn.execute("UPDATE ...")
        await conn.execute("DELETE ...")
```

Never use SQLAlchemy, never open a direct `asyncpg.connect()` — always use the pool.

---

## Shared utilities

`api/utils.py` — use these, never reimplement:
- `client_ip(request)` — extracts real client IP from `X-Forwarded-For` or `request.client`
- `check_rate(key, store, limit, window_seconds)` — in-process rate limiter; `store` is a module-level dict

---

## Services map

| Service | Responsibility |
|---|---|
| `services/auth.py` | OTP generation, JWT sign/verify, API key hashing, tenant upsert |
| `services/api_keys.py` | API key CRUD, scoped-key creation, plan slot assertion |
| `services/billing.py` | Billing status stub — always returns `has_access: True` |
| `services/entitlements.py` | **Single source of truth** for plan caps (`PLAN_ENTITLEMENTS` dict) |
| `services/embeddings.py` | OpenAI embedding generation + Redis cache (24 h TTL) |
| `services/embedding_config.py` | Per-tenant embedding model config (`QDRANT_COLLECTION`, `VECTOR_SIZE`) |
| `services/event_write.py` | Core event ingestion: Postgres insert + Qdrant upsert (non-fatal if Qdrant fails) |
| `services/account.py` | Trial activation, GDPR consent, account deletion |

---

## Schema migrations

- **Fresh install**: `core/db/schema.sql` — mounted as Docker init script, runs once
- **Running install**: `core/db/connection.py::init_db()` — `ALTER TABLE IF EXISTS` runs on every startup
- **Named migrations**: `core/db/migrations/002–007_*.sql` — applied manually during deploys
- **Rule**: always write idempotent DDL (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`)

---

## Startup behaviour

`main.py` lifespan calls `init_db()` on startup which:
1. Creates asyncpg pool + Redis + Qdrant client
2. Runs `ALTER TABLE` migrations idempotently
3. Creates community/SDK/marketing tables if missing
4. Backfills `users.plan = 'pro'` for users with `plan IS NULL`
5. Seeds a dev tenant when `ENV=development` or `DEV_API_KEY` is set

---

## Known issues (audit findings — not yet fixed)

| Issue | Location | Impact |
|---|---|---|
| CORS `allow_origins=["*"]` + `allow_credentials=True` | `main.py:97–102` | Browsers reject credentialed cross-origin requests — dashboard cookie auth silently fails cross-origin |
| `GET /health` always returns HTTP 200 | `main.py:120–122` | Deploy script polls this; a deploy "succeeds" even when Postgres is unreachable. Use `/health/deep` for real checks |
| Redis embedding cache broken across workers | `services/embeddings.py:37` | Cache key uses `hash(text)` — non-stable across processes. Effective cache hit rate is near zero with 4 workers |
| Rate limiting 4× effective limit | `api/utils.py:17–29`, `api/auth.py:26–40` | With `--workers 4`, each worker has its own rate dict. OTP brute-force protection is 4× weaker than configured |
| 80 Postgres connections at full load | `db/connection.py:22–25` | `max_size=20` × 4 workers = 80 connections. Postgres default `max_connections=100`. Add PgBouncer before horizontal scaling |

---

## Test commands

```bash
# Lint (ruff binary on this machine)
/Users/apple/Library/Python/3.14/bin/ruff check core/

# Unit tests
pytest core/tests/ -m "not integration" -v

# Integration tests (requires running stack)
bash scripts/setup-local.sh
ZIZKADB_RUN_INTEGRATION=1 pytest core/tests/ -m integration -v
```
