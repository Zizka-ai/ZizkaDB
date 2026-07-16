# core/ — ZizkaDB API

The FastAPI backend. Handles all event ingestion, causal chain queries, semantic search, agent management, authentication, and dashboard APIs.

## Stack

- **FastAPI** 0.111 + **asyncpg** (no ORM) + **Python 3.10+**
- **PostgreSQL 16** + pgvector (events, agents, users, API keys)
- **Qdrant** (vector semantic search — collection `agent_events`, 1536-dim cosine)
- **Redis 7** (embedding cache, 24 h TTL)

## Routers (14 total, all at `/v1/`)

| File | Prefix | Purpose |
|---|---|---|
| `api/events.py` | `/v1/events` | Log events, query events, time-travel (`db.at()`) |
| `api/agents.py` | `/v1/agents` | Agent stats, sessions, causal lineage (`db.why()`), baseline |
| `api/search.py` | `/v1/search` | Semantic search (`db.search()`) |
| `api/memory.py` | `/v1/memory` | Memory injection (`db.context_for()`, `db.memory_diff()`) |
| `api/auth.py` | `/v1/auth` | OTP login, JWT tokens, API key management |
| `api/billing_checkout.py` | `/v1/billing` | Plan/trial status (stubbed — always `has_access: True`) |
| `api/account.py` | `/v1/account` | User profile, GDPR consent |
| `api/settings.py` | `/v1/settings` | Tenant settings, embedding config |
| `api/stats.py` | `/v1/stats` | Aggregate usage stats |
| `api/telemetry.py` | `/v1/telemetry` | Anonymous SDK install pings |
| `api/community.py` | `/v1/community` | Public community board |
| `api/demo_requests.py` | `/v1/demo-requests` | Enterprise demo request form |
| `api/marketing_subscriptions.py` | `/v1/marketing-subscriptions` | Email signup |
| `api/admin.py` | `/v1/admin` | Admin-only panel (hidden from OpenAPI schema) |

Swagger UI: `http://localhost:8000/swagger`

## Local dev

```bash
# From repo root — starts API + all services
bash scripts/setup-local.sh

# API runs on http://localhost:8000
# Dev API key: zizkadb_dev_local (auto-accepted in development mode)
```

## Tests

```bash
pytest core/tests/ -m "not integration" -v     # unit tests
pytest core/tests/ -m integration -v           # needs running stack
```

## Key files

- `main.py` — FastAPI app, lifespan, router mounts
- `api/deps.py` — Auth dependencies (`get_tenant`, `require_dashboard_session`, `assert_agent_allowed`)
- `db/connection.py` — Connection pool setup, startup migrations
- `db/schema.sql` — Complete database schema
- `services/entitlements.py` — Single source of truth for plan caps
- `services/event_write.py` — Core event ingestion pipeline

See [`CLAUDE.md`](CLAUDE.md) for full conventions and architectural context.
