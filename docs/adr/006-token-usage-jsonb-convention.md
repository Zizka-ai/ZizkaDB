# ADR-006: `token_usage` JSONB Convention + Hardcoded Pricing

**Status**: Accepted
**Date**: 2026

---

## Context

The Reports tab's Overview page (`GET /v1/agents/{id}/report`) is built entirely from
real event rows, and the codebase carries an explicit guarantee — no fabricated
cost/token/SLA metrics (see `dashboard/DASHBOARD_KNOWLEDGE_BASE.md`). There was no
token/cost data anywhere in the system: no columns on `events`, no ingestion path, no
pricing table. Adding a Token Usage report meant deciding, before any UI work, how
token/cost data gets into the database in the first place, and how cost gets
computed from it.

Two questions needed answers:

1. **Where do agents/SDKs report token usage?** A new table, new columns on `events`,
   or the existing `events.data` JSONB payload?
2. **Where does $-cost come from?** Trust a client-supplied cost, call out to a
   pricing API, or compute it server-side from a maintained table?

## Decision

### 1. Token usage rides in `events.data` as a documented JSONB key, not a new column/table

Every event already carries an arbitrary JSONB `data` payload. Rather than adding a
schema migration (new columns, a new `token_usage` table, or a join), agents/SDKs
report token usage using a documented convention key on that existing payload:

```json
{
  "event_type": "llm_call",
  "data": {
    "token_usage": {
      "model": "claude-sonnet-5",
      "input_tokens": 1200,
      "output_tokens": 340,
      "cached_tokens": 0,
      "reasoning_tokens": 0
    }
  }
}
```

The backend (`core/services/token_usage.py`) aggregates by reading
`data->'token_usage'` from `events` where the key is present
(`WHERE data ? 'token_usage'`), scoped to the tenant/agent/time-range exactly like
`services/reports.py`. Every field on `token_usage` is optional and defensively
coalesced to `0` in SQL (`COALESCE((data->'token_usage'->>'input_tokens')::bigint, 0)`)
and re-clamped non-negative in Python, so a malformed or partial payload (wrong
type, missing key, a stray negative number) is excluded from that field's
contribution rather than raising or corrupting a total.

**Why not a new table or new columns:**
- **No schema migration required.** This feature ships with zero DDL — nothing to
  make idempotent, no `ALTER TABLE`, no backfill. It works *retroactively* on any
  event a tenant already logged, the moment their SDK starts setting the field.
- **Matches the existing `events.data` pattern.** The events table is already the
  single source of truth for arbitrary per-event structured data; a new table would
  duplicate that role and require a join (`services/reports.py`'s own docs call out
  wanting to avoid joins that could fan out rows and double-count — the token-usage
  aggregation reads one row per event for exactly the same reason).
- **One event, one row.** Because token_usage lives on the same row as the event
  itself (not a separate table keyed by `event_id`), summing `data->'token_usage'`
  columns can never double-count from a fan-out join. This invariant is asserted
  directly in `core/tests/test_token_usage.py` (`test_sum_of_breakdown_equals_total_multi_dimension`).

**Trade-off accepted:** this is a soft, undocumented-at-the-DB-level contract — Postgres
can't enforce the shape of `data->'token_usage'` the way a real column/type would.
That's why every field is read defensively (`COALESCE(...::bigint, 0)`) rather than
assumed well-formed, and why an event missing the key is excluded entirely
(not counted as zero-usage) so historical events don't silently appear as "0 tokens
used" rows in a breakdown.

**Consequence for SDKs:** Python/TypeScript SDKs, the MCP server, and any other
event producer wanting to appear in the Token Usage report must start setting
`data.token_usage` on `llm_call`-shaped events using this exact key/shape. This is
new required behavior for SDK authors, not automatic — no historical event
retroactively gains token data no SDK ever recorded.

### 2. Cost is computed server-side from a hardcoded pricing map, never trusted from the client

`core/services/pricing.py` mirrors the structure of
`core/services/entitlements.py::PLAN_ENTITLEMENTS`: a frozen dataclass value type
(`ModelPricing`), a plain `dict[str, ModelPricing]` (`MODEL_PRICING`) keyed by model
name, and a pure `cost_for(model, input_tokens, output_tokens, cached_tokens)`
lookup function. `token_usage.py` calls `pricing.cost_for` per row and sums the
result — a client (SDK, agent) never supplies a dollar cost directly, matching the
"no fabricated numbers" invariant: cost is a deterministic function of real token
counts and a maintained, auditable price table, not something the caller asserts.

**Unknown models never crash or guess.** A model absent from `MODEL_PRICING` gets
`DEFAULT_PRICING` (`$0`/1K tokens) — `cost_for` never raises. The model name is
collected into the response's top-level `unpriced_models` list so the UI can render
an explicit "cost not available for these models" notice instead of silently
showing a total that's wrong-but-plausible-looking. Token counts for an unpriced
model are still counted in full; only its cost contribution is `$0`.

**Why hardcoded instead of a pricing API/service:** the entitlements pattern this
mirrors is already the accepted approach in this codebase for "small, rarely-changing,
security/financially-relevant lookup table" data — `PLAN_ENTITLEMENTS` is the single
source of truth for plan caps, and `MODEL_PRICING` is the single source of truth for
per-model $/1K pricing, both edited directly in their respective files rather than
fetched at runtime. A live pricing API adds a network dependency and failure mode to
every report request for data that changes on the order of "vendor announces new
pricing," not per-request.

**Consequence for future maintenance:** `MODEL_PRICING` must be updated by hand when
a new model ships or a vendor changes pricing. There is no reconciliation against a
vendor API — a stale entry silently under/over-reports cost for that model until the
table is edited. This is an accepted trade-off, not an oversight: it's the same
trade-off `entitlements.py::PLAN_ENTITLEMENTS` already makes, called out in the root
`CLAUDE.md`'s "Entitlements" section as "the single source of truth."

## Consequences

- No DB migration ships with this feature. `core/db/schema.sql` and
  `core/db/connection.py::init_db()` are untouched.
- `GET /v1/agents/{id}/token-usage` (auth: `get_tenant` + `assert_agent_allowed`, same
  tier as `/report`) returns `$0`/empty-array/`null` gracefully when no event in the
  tenant/agent/range carries `data.token_usage` — an empty state, not an error.
- SDK/integration authors need to be told about this convention for their events to
  show up here at all — this is the reason this ADR exists as a discoverable
  document rather than being buried only in code comments.
- Adding/adjusting pricing is a one-file change (`core/services/pricing.py`), same
  operational shape as adjusting `PLAN_ENTITLEMENTS`.
