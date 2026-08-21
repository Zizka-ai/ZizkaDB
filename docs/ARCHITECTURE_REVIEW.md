# ZizkaDB — High-Level Architecture Review

**Date:** 2026-07-25 · **Branch:** `main` (pre-release, OSS + Enterprise) · **Type:** architecture &
production-readiness review (not a line-level code review).

This review is grounded in fact — every claim carries a `file:line` reference. **Scope: assess the
architecture, flag what is broken / risky / unused, and lay out a prioritized fix plan. No code was
changed to produce it; fixes are sequenced for later execution.**

---

## 1. Executive Summary

ZizkaDB is a **well-designed domain system with a production-grade core and a not-yet-production
operational envelope.** The domain architecture — the causal-lineage event store, dual-write
Postgres + Qdrant, the AI Suggestions subsystem, and the auth split — is clean, layered,
ADR-documented, and genuinely differentiated.

The gaps are almost entirely **operational**:

- The API is **not horizontally scalable** (in-process rate-limit state).
- There is **no background-processing tier** — 20–60s AI calls and all embedding/vector writes run
  inside the HTTP request and block the (only 4) uvicorn workers.
- There is **near-zero production observability** — no metrics, tracing, error tracking, or security
  audit log.

**Verdict:** ship-ready for single-node open-source deployment today; **not** yet ready for Enterprise
SLAs or horizontal scale without the Phase 1–2 items below. Crucially, **no redesign is required** —
the layering is sound and the fixes are additive (a queue tier, shared-state externalization, an
observability baseline).

---

## 2. Architecture Assessment

### Well-designed — keep and build on

- **Layering & separation of concerns.** `api/` (routers + auth) → `services/` (business logic) →
  `db/` (asyncpg pool). No ORM — a deliberate, ADR-documented choice. The auth split
  (`get_tenant` / `require_dashboard_session` / `assert_agent_allowed`, `core/api/deps.py`) is a
  clean, testable model, now hardened with per-agent scoping.
- **Domain model.** Causal lineage via `parent_event_id` + a recursive CTE (ADR-001); dual-write with
  Postgres as source of truth and Qdrant for ANN search (ADR-002). Multi-tenant from the ground up —
  `tenant_id` on every table and in every query.
- **AI subsystem (the standout).** `core/services/suggestions/` + `core/services/ai/`: deterministic
  evidence extraction → **structural anti-hallucination** (the tool schema's `enum` is built
  per-request from the real signal ids, so a fabricated reference is impossible) → a validation layer
  → a `SuggestionProvider` abstraction. Config-driven (models/thresholds in one file). This is the
  strongest part of the codebase and the right template for future AI features.
- **Extensibility.** First-class Python/TS SDKs, standalone LangChain/CrewAI integrations, and an
  MIT-licensed MCP server. The provider interface allows Claude → OpenAI/Gemini swaps without touching
  business logic.
- **Graceful degradation at write time.** Qdrant / OpenAI / Redis failures are non-fatal on the event
  path (the event still persists; response carries `indexed:false`). Claude calls retry with backoff
  and honor `Retry-After`.
- **ADRs.** `docs/adr/` documents the "why" behind the five load-bearing decisions.

### Should improve — the focus of this review

- **Statelessness is broken.** In-process rate-limit dicts (`core/api/agents.py:32-33`,
  `core/api/utils.py`) are per-worker / per-process; the effective limit is already ~4× the configured
  value at 4 workers, and worse under replicas.
- **No async/background tier.** Everything is synchronous request/response — no queue, worker, or
  scheduler anywhere. AI generation and embedding/Qdrant writes block HTTP workers.
- **Observability floor.** Unstructured stdlib logging, no metrics/tracing/Sentry, no security audit
  log, and a `/health` that always returns 200.
- **Config sprawl.** 59 scattered `os.getenv` reads, no typed settings, no fail-fast validation.
- **Single points of failure.** One container each of Postgres/Qdrant/Redis; no HA; ~80 Postgres
  connections vs a default max of 100, with no PgBouncer.

---

## 3. Risks

| # | Risk | Severity | Evidence |
|---|------|----------|----------|
| R1 | **Worker-pool exhaustion / self-DoS** — 20–60s synchronous Claude calls run inside HTTP requests with only 4 workers; a handful of concurrent Suggestions requests can stall the whole API | **Critical** | `core/api/agents.py::agent_suggestions` awaits the engine inline; `core/services/ai/config.py` timeout 60s × 3 retries; no offloading |
| R2 | **Not horizontally scalable** — in-process rate-limit/lock state multiplies across replicas and loses coordination; single-EC2, no LB | **Critical** | `core/api/agents.py:32-33`, `core/api/utils.py`; single-host compose |
| R3 | **DB connection ceiling** — 4×20 = 80 connections vs PG default 100, no PgBouncer → adding workers/replicas exhausts Postgres | **High** | `core/db/connection.py` `max_size=20` |
| R4 | **No production observability** — unstructured logs, no metrics/tracing/error tracking → prod incidents hard to detect or diagnose | **High** | `core/main.py:21` `basicConfig`; no Prometheus/OTel/Sentry |
| R5 | **No security audit log** — key revoke, GDPR forget, auth events use plain app logs → Enterprise compliance blocker | **High** | grep "audit" in `core/` → 0 |
| R6 | **Synchronous ingestion hot path** — every event write blocks on OpenAI embed + Qdrant upsert → ingestion latency coupled to two external services | **High** | `core/services/event_write.py:82-107` inline |
| R7 | **CORS `allow_origins=["*"]` + `allow_credentials=True`** — browsers reject credentialed cross-origin requests, and it is an insecure default | **Medium** | `core/main.py:90-96` |
| R8 | **`/health` always 200** (no dependency check) → LB/deploy sees "healthy" with Postgres down | **Medium** | `core/main.py:109-111` |
| R9 | **Config sprawl, no validation** → silent misconfiguration; no fail-fast on bad/missing env | **Medium** | 59 `os.getenv`; `core/services/ai/config.py:6` "no Settings class" |
| R10 | **No CD + out-of-tree deploy assets** — `deploy-production.sh` and prod `nginx.conf` are referenced but absent from the repo → DR/reproducibility risk | **Medium** | referenced in `infra/docker-compose.yml:12,99`, `dashboard/ecosystem.config.js:8` |
| R11 | **Datastore SPOFs** — single Postgres/Qdrant/Redis, no replication/HA | **Medium** | single containers, local volumes |
| R12 | **Stale docs / dead references** — largely reconciled this cycle (router map 14→9; absent `admin`/`stats`/`community`/`demo`/`marketing`) | **Low** | fixed in `CLAUDE.md`, KB, wiki |
| R13 | **Version drift** — `core/main.py` 0.1.0, SDKs 0.2.6, MCP 0.1.5; version hardcoded twice in `main.py` | **Low** | vs the "bump together" doc rule |

---

## 4. Recommendations (prioritized)

Each item: *current issue → why it matters → proposed solution → benefit.*

### P1 — Unblock scale & protect the API (0–3 months)

- **Externalize shared state to Redis (R2).** *Issue:* rate-limit state lives in per-worker dicts.
  *Why:* replicas multiply limits and can't coordinate. *Solution:* move the suggestions limiter to the
  Redis pattern already proven for OTP (`core/api/auth.py:42-72`) and the suggestions lock
  (`core/services/suggestions/engine.py`). *Benefit:* true statelessness → safe multi-replica.
- **Add PgBouncer (R3).** *Issue:* worker×pool exceeds PG's connection ceiling. *Why:* blocks any
  scale-up. *Solution:* transaction-pooling PgBouncer in front of Postgres. *Benefit:* decouples
  worker/replica count from PG connections. *(See §7 for the asyncpg prepared-statement caveat.)*
- **Readiness vs liveness (R8).** *Issue:* `/health` always 200. *Why:* deploys/LBs can't tell when a
  dependency is down. *Solution:* **do not change `/health`** (6+ scripts poll it and grep
  `"status":"ok"`) — point the LB/deploy **readiness** probe at the existing `/health/deep`.
  *Benefit:* real readiness signal with zero script breakage. Separately, tighten CORS to an env-driven
  allowlist (R7).
- **Observability baseline (R4, R5).** *Issue:* no structured logs/metrics/tracing/audit. *Why:* prod
  incidents are hard to diagnose and Enterprise requires an audit trail. *Solution:* structured JSON
  logging + request-id middleware, Prometheus (or OTel) metrics, Sentry, and a `security_audit_log`
  table written on key revoke / GDPR forget / auth. *Benefit:* diagnosability + compliance.
- **Central typed config (R9).** *Issue:* 59 scattered getenv, no validation. *Why:* silent
  misconfiguration. *Solution:* a pydantic `BaseSettings` that reads env once and fails fast, wrapping
  the existing `ai/config.py` / `embedding_config.py` helpers. *Benefit:* one documented, validated
  config surface. *(See §7 — must be default-preserving.)*

### P2 — Introduce a background-processing tier (3–6 months)

- **Job queue + worker (R1, R6).** *Issue:* AI generation and embedding/Qdrant writes block HTTP
  workers. *Why:* a few slow AI calls can stall the whole API; ingestion latency is coupled to external
  services. *Solution:* offload (a) Suggestions generation and (b) event embedding + Qdrant upsert to
  background workers. For Suggestions, move to **compute-async + poll** — the endpoint enqueues and
  returns `status:"generating"`; the FE already polls (`dashboard/hooks/useAgentSuggestions.ts`).
  *Options:* `arq` (async-native, Redis-backed — fits the stack) or Celery. *Benefit:* workers never
  block; ingestion decoupled; removes the R1 self-DoS. *(See §7 — keep a synchronous single-node
  fallback.)*

### P3 — HA & Enterprise (6–12 months)

- Managed/replicated datastores (RDS Postgres, Qdrant replication, Redis Sentinel/managed) (R11).
- Horizontal API autoscaling behind a real LB once P1 makes the API stateless.
- CD pipeline + commit prod `nginx.conf` / deploy scripts to the repo for reproducibility (R10).
- Enterprise: feature-flag service, RBAC beyond agent-scoping, usage-metering → billing
  productionization (billing is an intentional stub today — ADR-003 — but is wired into the dashboard).

---

## 5. Removable / Unused (verify before deleting)

- **`idx_events_embedding` HNSW index** (`core/db/schema.sql:128-129`). The `events.embedding` pgvector
  column is a deliberate portability copy (ADR-002), but search/memory read from **Qdrant**, never this
  column (`core/api/search.py:54`, `core/api/memory.py:100` pass a *query* vector; no Postgres vector
  operator appears anywhere). The index is therefore pure **write-amplification** — rebuilt on every
  insert, never queried. **Recommend dropping the index and keeping the column.** Highest-value
  removable — a direct win on the write hot path.
- **`usage_daily` table** (`core/db/schema.sql:135`). Written by the event meter
  (`core/services/event_write.py:114`) but **never read** — write-only. Keep only if billing/reporting
  will consume it soon; otherwise remove the write + table.
- **`sdk_telemetry` table** (`core/db/schema.sql:150`). Written by `/v1/telemetry`
  (`core/api/telemetry.py:36`) but **never read** — anonymous ping counts collected and never
  surfaced. Decide: surface it (ops view) or drop it.
- **Already cleaned this cycle:** 60 junk ` 2.` sync-artifact files removed; router map + auth docs
  reconciled to the real 9 routers. No residual dead routes found.
- **Do NOT remove:** `/v1/billing` is a stub but **is used** by the dashboard `AccountMenu`
  (`dashboard/components/dashboard/AccountMenu.tsx`).

---

## 6. Future Roadmap (6–12 months)

- **Phase 1 (0–3 mo) — Scale-ready & observable:** Redis-backed limits/locks, PgBouncer, observability
  baseline + audit log, typed config, readiness/CORS. → enables multi-replica and satisfies Enterprise
  audit.
- **Phase 2 (3–6 mo) — Async tier:** job queue + workers for AI and ingestion; Suggestions → job+poll.
  → removes worker-pool blocking; decouples ingestion latency.
- **Phase 3 (6–12 mo) — HA & Enterprise:** replicated datastores, autoscaling behind a LB, CD + IaC,
  feature flags, RBAC, billing productionization.

---

## 7. Fix-Safety & Edge Cases

So that no fix introduces a regression — each with what could break and the safe approach:

- **Redis-backed suggestion rate limit (P1):** must **fail OPEN** — if Redis is unreachable, allow the
  request. The OTP limiter deliberately fails **closed** (`core/api/auth.py:104-108`, a security
  control); copying that here would let a Redis blip take down Suggestions. Keep the in-process dict as
  a local fallback so single-node OSS still throttles.
- **`/health` (P1):** leave unchanged. 6+ scripts (`scripts/smoke-test.sh`, `scripts/verify-release.sh`,
  `scripts/setup-local.sh`, `scripts/restart-native-stack.sh`, `scripts/quickstart-remote.sh`,
  `scripts/validate-selfhost-config.sh`) poll it and grep `"status":"ok"`; startup loops depend on it.
  Repoint *readiness* to `/health/deep` — do not alter `/health`'s body/status.
- **CORS allowlist (P1):** browser-only. The Python/TS SDKs and MCP send no `Origin`, so they are
  unaffected. Risk is a self-hoster with a custom dashboard domain being locked out → make it an env
  var (`CORS_ALLOWED_ORIGINS`) that defaults to the dashboard origin, and document it.
- **Central typed config (P1):** the migration must be **default-preserving and additive** — read the
  same env with the same defaults; validate types and required-*when-used* keys, but **never** promote
  a currently-optional var to required (that breaks existing `.env` on upgrade). Wrap the existing
  helpers; don't rewrite all call sites at once.
- **PgBouncer (P1):** asyncpg uses server-side prepared statements, which **break under transaction
  pooling**. Use **session** pooling or set `statement_cache_size=0` on the asyncpg pool
  (`core/db/connection.py`), and validate against the app's real queries (recursive CTEs,
  `ANY($1::uuid[])`) before rollout.
- **Drop `idx_events_embedding` (cleanup):** **index only — keep the column.**
  `core/services/event_write.py:87` still `UPDATE events SET embedding` on every write. Use
  `DROP INDEX IF EXISTS` (idempotent DDL), confirm with `EXPLAIN` that no plan references it, and re-run
  the Qdrant-backed search/memory tests.
- **Remove `usage_daily` / `sdk_telemetry` (cleanup):** do **not** auto-drop — write-only *in this
  repo* but may feed external analytics/billing. Gate on a product decision; if removed, drop the write
  first, then the table in a later idempotent migration.
- **Async job tier (P2 — highest blast radius):** preserve the single-node OSS story — ship the worker
  as **optional**, with the synchronous path as a config-flagged fallback so a one-container self-host
  still works with no broker. Suggestions job+poll must be **backward-compatible** — the response
  already carries a `status` enum, so adding `generating` is additive; keep synchronous behavior as the
  default until the FE poll path ships. Do not change the SDK contract.
- **Observability/audit (P1):** additive only (new middleware, a new `security_audit_log` table via
  idempotent DDL). Keep human-readable local dev logs — gate JSON output on `ENV=production`.

**Global guardrails for every phase:** idempotent DDL (invariant #5); never move an SDK-callable route
onto `require_dashboard_session` (invariant #1); keep OSS single-node working without
Redis/broker/PgBouncer; make changes additive/flag-gated; keep each phase independently revertible with
gates green (`ruff check core/`, container `pytest tests/`, dashboard `lint && build && test`).
