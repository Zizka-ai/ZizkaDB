# ZizkaDB — GitHub Copilot Instructions

ZizkaDB is a causal event database for AI agents (FastAPI + Next.js 14 + PostgreSQL/pgvector + Qdrant + Redis). AGPL-3.0, except the MCP server which is MIT.

## Stack

| Area | Technology |
|---|---|
| Backend | FastAPI + asyncpg (no ORM), Python 3.10+ |
| Database | PostgreSQL 16 + pgvector extension |
| Vector search | Qdrant (`agent_events` collection, 1536-dim cosine) |
| Frontend | Next.js 14 App Router, TypeScript strict |
| Python SDK | `zizkadb-sdk` — async client, `async with ZizkaDB(...) as db:` |
| TypeScript SDK | `zizkadb-sdk` — sync constructor, camelCase fields |
| MCP server | `zizkadb-mcp` — MIT license, `uvx zizkadb-mcp` |

## Module map

- `core/` — FastAPI backend (14 routers at `/v1/`)
- `dashboard/` — Next.js dashboard + marketing. See `dashboard/DASHBOARD_KNOWLEDGE_BASE.md`.
- `sdk/python/` — Python SDK + `zizkadb init` CLI
- `sdk/typescript/` — TypeScript SDK
- `integrations/` — Standalone LangChain + CrewAI adapter packages
- `mcp/` — MCP server (MIT, not AGPL)
- `infra/` — Docker Compose (prod base + dev overlay)
- `docs/adr/` — Architecture Decision Records

## Auth dependency rules (Python)

| Route type | Use |
|---|---|
| SDK-callable (log events, search, memory) | `Depends(get_tenant)` |
| Dashboard-only (manage keys, billing, destructive ops) | `Depends(require_dashboard_session)` |
| Admin panel | `require_admin` (checks `FOUNDER_EMAIL` env var) |
| Per-agent analytics routes | Also call `assert_agent_allowed(tenant, agent_id)` first |

**Never** use `get_tenant` on routes that access `user_id` or manage API keys — use `require_dashboard_session`.

## Coding conventions

**Python**: async everywhere, asyncpg pool from `core/db/connection.py::get_pool()`, `Depends()` for auth, ruff for linting. Shared rate-limit/IP helpers in `core/api/utils.py`.

**TypeScript/Dashboard**: Next.js 14 App Router, Client Components (`'use client'`), no React Query/Zustand/Context. All API calls through `dashboard/lib/api.ts::apiFetch`. Match surrounding style (2-space, single quotes, no semicolons).

## Critical rules

1. Never rename `/v1/` route paths without updating `dashboard/lib/api.ts`
2. All schema DDL must be idempotent (`IF NOT EXISTS`) — runs on live databases
3. Plan entitlement caps live only in `core/services/entitlements.py::PLAN_ENTITLEMENTS`
4. `docker-compose.yml` is production — never add `--reload` or volume mounts there
5. `billing_status_payload()` always returns `has_access: True` — billing is intentionally stubbed

## Running tests

```bash
# Lint
ruff check core/ sdk/python/ mcp/ integrations/

# Unit tests
pytest core/tests/ -m "not integration" -v
pytest sdk/python/tests/ -v
pytest mcp/tests/ -v

# TypeScript SDK
cd sdk/typescript && npm test

# Dashboard
cd dashboard && npm run lint && npm run build
```

Full context: `CLAUDE.md` · `dashboard/DASHBOARD_KNOWLEDGE_BASE.md` · `docs/adr/` · `.cursor/rules/`
