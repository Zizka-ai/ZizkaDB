# ADR-007: Token Optimization Suggestions Are 100% Deterministic (No LLM Call)

**Status**: Accepted
**Date**: 2026

---

## Context

The Token Usage report (ADR-006) shows *what* was spent. The natural next step is a
feature that tells the user *what to do about it* — a "Token Optimization" sub-tab
inside the existing Suggestions tab, surfacing concrete, prioritized recommendations
with a real dollar-savings figure, a token-reduction %, and a confidence score.

The codebase already has an AI-driven suggestions pipeline
(`core/services/suggestions/`, described in `dashboard/DASHBOARD_KNOWLEDGE_BASE.md`'s
Suggestions section): deterministic evidence extraction feeds Claude via forced tool
use, and a validation layer drops anything not grounded in a cited evidence signal.
That pipeline was deliberately *not* reused for Token Optimization. This ADR records
why.

## Decision

**Token Optimization Suggestions (`core/services/token_optimization.py` +
`token_optimization_config.py` + `token_optimization_models.py`) make zero LLM calls.**
Every suggestion — its $ savings, % reduction, and confidence score — is produced by a
pure, unit-testable detector function operating on real
`events.data.token_usage`-derived aggregates (reusing `token_usage.py`'s
`fetch_rows`/`row_metrics`/`_breakdown_from`/`_trend`), gated by a fixed
`THRESHOLDS` dict (`token_optimization_config.py`) so a suggestion only appears once
it crosses a defensible noise floor.

### Why not reuse the AI Suggestions pipeline

1. **The AI pipeline is deliberately not built to state exact numbers.** Its
   evidence-grounding validation layer (`services/suggestions/validation.py`) exists
   specifically to stop Claude from inventing a number not directly copied from a
   supplied `Evidence.metrics` value — it constrains *whether Claude can speak at
   all*, not *what arithmetic it performs*. "$45.20/month in savings by switching to
   gpt-4o-mini" is a computed result of a specific formula (recompute historical token
   counts at a candidate model's real price), not a fact that pre-exists in an
   evidence bundle for Claude to cite. Bolting exact-arithmetic requirements onto a
   text-generation pipeline is the wrong tool for a problem that is already 100%
   mechanical.
2. **"No fabricated cost/token metrics" is a load-bearing invariant in this codebase**
   (see root `CLAUDE.md`, `dashboard/DASHBOARD_KNOWLEDGE_BASE.md`, and ADR-006). A
   feature whose entire value proposition is "trust these dollar figures enough to act
   on them" cannot rely on an LLM's arithmetic, even a heavily-grounded one — a
   deterministic function is the only way to guarantee "the number shown is exactly
   what the formula says it is," which is the accuracy bar this feature holds itself to
   (see the Test plan in the implementation for the ground-truth verification
   methodology this bar requires).
3. **Self-hosted OSS must work without `ANTHROPIC_API_KEY`.** AI Suggestions already
   degrades gracefully to an `ai_not_configured` status when no key is set — by
   design, a self-hosted deployment with no key still gets full core functionality.
   Token Optimization is deliberately built to *never* have that degraded state: it is
   pure computation over data already in Postgres, so it works identically in every
   deployment (managed cloud or self-hosted OSS) regardless of AI configuration.
4. **No AI spend, no AI latency, no AI rate limiting required.** The route
   (`GET /v1/agents/{id}/token-optimization`) intentionally has no per-tenant AI
   throttle (unlike `/suggestions`' `_SUGGESTIONS_REFRESH_RATE`/`_SUGGESTIONS_RATE`) —
   the same reasoning already documented for `/token-usage`: it's a bounded,
   already-indexed aggregation query, not an external paid API call.

### Separate, unrelated type hierarchy

`token_optimization_models.py`'s `TokenOptimizationSuggestion` /
`TokenOptimizationAggregates` / `TokenOptimizationResult` dataclasses share **no base
class** with `services/suggestions/models.py`'s `Evidence`/`Suggestion`. This is
intentional, not an oversight: the AI pipeline's types exist to support grounding
(`Evidence.strength` caps a `Suggestion.confidence`, `EvidenceBundle.fingerprint()`
drives a cache key) — machinery that has no meaning for a deterministic feature with
no LLM call and no cache. Coupling the two type hierarchies for superficial code reuse
would create a confusing dependency between two features built on fundamentally
different paradigms.

### v1 scope: only detectors computable from data already logged today

Five detectors ship in v1, all computable from `events.data.token_usage` (per ADR-006)
plus the generic event columns `services/suggestions/evidence.py`'s retry-loop
detector already reads:

1. **Model Optimization** — expensive model → cheaper known substitute, savings
   recomputed from real historical token counts at the candidate's real price.
2. **High Token Consumption** — dominant cost share by agent/workflow/model/user.
3. **Cache Opportunities** — repeated same-size-bucket requests (a proxy for
   near-identical requests; no prompt text is available to confirm true duplication).
4. **Retry / Tool-loop Analysis** — adapts `evidence.py`'s consecutive-duplicate-event
   SQL, reframed with the real $ cost of the wasted repeats.
5. **Cost Anomalies** — leave-one-out z-score spike detection over
   `token_usage.py`'s own trend-bucket costs (reusing its bucket boundaries verbatim,
   never recomputing them, so a cited anomaly always aligns with what the Token Usage
   trend chart shows).

**Explicitly out of scope for v1 — Prompt Optimization and Context Optimization.**
Neither the `token_usage` JSONB convention (ADR-006) nor anything else currently
logged captures prompt or context *text* — only token *counts*. A "shorten your
system prompt" or "your context window is bloated with stale history" detector would
have no real data to compute from; it would have to either guess or reason about text
it never received, i.e. fabricate the finding. This is a **data-availability gap, not
an oversight or an implementation shortcut** — the moment prompt/context text (or a
structural proxy for it) is captured by a future convention, these two categories
become addable in the same deterministic style as the five above. Until then, they are
listed explicitly in every response's `meta.skipped_categories` /`meta.skip_reason`
rather than silently omitted, so the gap is visible to API consumers and the UI can
say so rather than implying "nothing to optimize here."

## Consequences

- No schema migration. Reads only `events.data.token_usage` (ADR-006) plus the
  existing `events` columns already used by the retry-loop query — nothing new to
  make idempotent.
- Every `$`/`%` figure returned by `GET /v1/agents/{id}/token-optimization` is a
  reproducible, hand-verifiable computation — see the implementation's ground-truth
  verification methodology (a small, fixed, non-random seed fixture with hand-computed
  expected values, asserted exactly, not "close enough").
- `total_potential_monthly_savings_usd` is computed from the **capped, returned**
  suggestion list, never a larger pre-cap set — the dashboard summary never promises
  savings the card list doesn't itself enumerate (`test_aggregates_reflect_capped_list_not_precap_set`).
- Overlapping detectors are expected, not a bug: the same underlying event/cost can
  legitimately appear in more than one suggestion (e.g. an expensive, retried,
  anomalous-day call) because each detector is a different lens on the same cost, not
  a mutually-exclusive category. Only same-category dedup (`validation.py`-style,
  by suggestion `id`) is applied.
- `MAX_SUGGESTIONS` caps the response at 12, client-side filtering only (no
  pagination). If a future increase to this cap makes the page unwieldy,
  pagination/virtualization is an explicit known future concern, not built
  defensively now (YAGNI).
- When prompt/context capture is added to the platform in the future, Prompt/Context
  Optimization can be added as new detectors in this same deterministic module without
  revisiting this ADR's core decision — they'd still be pure functions over real data,
  just a different data source than `token_usage`.
