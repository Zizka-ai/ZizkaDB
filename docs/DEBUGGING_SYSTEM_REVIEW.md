# ZizkaDB Debugging/Query System — Review & New-Capability Design

*Structured report covering the existing debugging/query system, its UX, gaps, proposed new
capabilities, testing strategy, and a prioritized roadmap.*

**Verification basis:** every endpoint, input, output, and behavior below was **confirmed live**
against a running local stack (API `:8000`, seeded data) — not just read from source. Code
references are to the current tree after the `chore/slim-public-product` merge (which removed
marketing/admin/docs/signup and the public `/v1/stats` counter — **no debugging/query feature was
affected**). Marker: **✓** = verified by a real request.

---

# 1. Existing feature review (Phase 1)

The debugging/query surface is **8 capabilities** + 3 supporting agent-analytics endpoints. Auth:
`get_tenant` (API key or dashboard JWT) via `core/api/deps.py`; per-agent analytics additionally
call `assert_agent_allowed(tenant, agent_id)`. Exceptions via `core/services/exceptions.py`
(`not_found`→404, `bad_request`→400). Storage: Postgres `events` (source of truth) + Qdrant
`agent_events` (1536-dim cosine ANN) + Redis (embedding cache).

---

## 1.1 Causal Trace ("Why")

### Purpose
- **Why it exists:** answer *"why did this event happen?"* by reconstructing the causal chain that
  led to it.
- **Problem solved:** in multi-step agents, a failure is usually a symptom; the cause is upstream.
  Manually paging through logs to find it is slow and error-prone.
- **Business value:** the flagship explainability/root-cause capability — the core reason ZizkaDB
  stores `parent_event_id` at all.

### User journey
- **Entry:** Dashboard → sidebar **Debugging → Causal Trace** (`/dashboard/debugging/why`); also a
  "Why?" side-panel tab inside an agent's Events tab.
- **Provides:** an **Event ID** (required); optionally a **Parent ID** (integrity guard).
- **Validation:** UUID regex client-side; server re-validates → 404 on bad/unknown id.
- **After submit:** the page walks the chain, renders a root-cause summary banner + a numbered,
  CloudWatch-style timeline (Origin / Root cause / Error / "you searched this" markers), each step
  expandable to full fields + JSON, with copy/share + "trace from here".

### Backend flow
- **API:** `GET /v1/events/{event_id}/why?depth=&parent_id=` (`core/api/events.py::why`). ✓
- **Query:** a `WITH RECURSIVE causal_chain` CTE on `events` — anchor row `event_id=$1 AND
  tenant_id=$2`; recurse `JOIN ON e.event_id = cc.parent_event_id WHERE e.tenant_id=$2 AND
  cc.depth<$3`; `ORDER BY depth DESC, timestamp ASC`. Index: `idx_events_parent`.
- **Model/shape:** each row via `_format_event`. Optional post-query `parent_id` integrity guard.
- **Answer generation:** returns the whole chain root-first; the dashboard derives the root cause
  (earliest error/fail-typed node) client-side.

### Inputs
| Input | R/O | Validation | Example | Error handling |
|---|---|---|---|---|
| `event_id` (path) | **R** | UUID | `5cdb3f8c-…` | bad/unknown → **404 "Event not found"** ✓ |
| `depth` (query) | O | int ≤ 50 (default 10) | `?depth=2` → 3 nodes ✓ | out-of-range clamped by `le=50` |
| `parent_id` (query) | O | UUID; must equal the event's real parent | `cee33729-…` | invalid → **400**; mismatch → **400** ✓ |

### Outputs
`{ event_id, chain_length, chain: [ {event_id, agent, timestamp, event, data, parent_id,
session_id, sequence_no} ] }` ✓
- **Root cause / origin** — the chain root is where the flow began; earliest error node is the root
  cause. *Useful:* points straight at the source of a failure.
- **Full ordered chain** — the execution path. *Generated:* recursive parent walk.

---

## 1.2 Time Travel ("At")

### Purpose
- **Why:** reconstruct *what an agent's state was at a past moment*, to reproduce the context of a
  past decision.
- **Problem solved:** "what did the agent know when it made this call?" — impossible from a flat log.
- **Value:** the "time travel" pillar; enables point-in-time debugging.

### User journey
- **Entry:** agent detail → **Time Travel** tab (no standalone page today).
- **Provides:** a **date/time** (required; agent is implicit from the page).
- **Validation:** empty → inline "Pick a date and time first."; server needs a valid ISO datetime.
- **After submit:** shows `event_count` at that time + a **reconstructed state** JSON.

### Backend flow
- **API:** `GET /v1/events/at?agent=&timestamp=` (`events.py::time_travel`). ✓
- **Query:** `SELECT … FROM events WHERE tenant_id=$1 AND agent_id=$2 AND timestamp<=$3 ORDER BY
  timestamp ASC`. Index: `idx_events_agent_time`.
- **Answer generation:** event-sourcing reduce — `STATE_SET`→`state.update(data)`,
  `STATE_DELETE`→`state.pop(key)`; any other type → sets `state["_last_event"]`.

### Inputs
| Input | R/O | Validation | Example | Error handling |
|---|---|---|---|---|
| `agent` (query) | **R** | non-empty | `why-demo-bot` | missing → **422** ✓ |
| `timestamp` (query) | **R** | ISO datetime | `2030-01-01T00:00:00Z` | missing/bad → **422** ✓ |

### Outputs
`{ agent, at, event_count, state }` ✓
- **Reconstructed state** — the agent's key/value memory at time T. *Useful:* reproduce past
  context. **⚠ Verified caveat:** for agents that don't emit `STATE_SET`/`STATE_DELETE`, `state`
  is `{"_last_event": {…}}` only — no real state. (Now explained in-UI, see §2.)

---

## 1.3 Semantic Search

### Purpose
- **Why:** find events by **natural-language meaning**, not exact fields.
- **Problem solved:** you rarely know the event id/type; you know *what happened* ("refund failed").
- **Value:** the "event search" pillar; fast history lookup.

### User journey
- **Entry:** Dashboard → **Search** (all agents), or agent-scoped inline search in agent detail.
- **Provides:** a **query** (required); optionally an agent scope (inline variant).
- **After submit:** ranked event cards with a % match.

### Backend flow
- **API:** `POST /v1/search` (`search.py::semantic_search`). ✓
- **Processing:** `generate_embedding(query)` (OpenAI, Redis-cached) → Qdrant `agent_events` ANN with
  tenant(+agent) filter → hydrate rows from Postgres by `event_id = ANY(...)` → sort by score.
- **Hard dependency:** embeddings must be configured, else **400** with a setup message.

### Inputs
| Input | R/O | Validation | Example | Error handling |
|---|---|---|---|---|
| `query` (body) | **R** | non-empty | `"refund failure"` | missing → **422** ✓ |
| `agent` (body) | O | scopes to one agent | `"why-demo-bot"` | — |
| `limit` (body) | O | int (default 10; UI 20) | `10` | — |
| *embeddings config* | prereq | OpenAI key set | — | unset → **400 "Embedding generation failed…"** ✓ |

### Outputs
`{ query, results: [ {event_id, agent, timestamp, event, data, parent_id, score} ] }` (or
`{results: []}`). ✓ **Similar events + confidence (score)** — *useful:* locate relevant history;
*generated:* Qdrant cosine similarity.

---

## 1.4 Memory Diff ("Session Insights")

### Purpose
- **Why:** summarize one session and flag *what was new/anomalous* vs the agent's prior sessions.
- **Problem solved:** triage which run went wrong without reading every event.
- **Value:** memory-inspection + reliability.

### User journey
- **Entry:** agent detail → **Sessions** tab → click a session (summary + "new event types" badge).
- **Provides:** a **session_id** (from the list).

### Backend flow
- **API:** `GET /v1/memory/diff/{session_id}` (`memory.py::session_diff`). ✓ No embeddings.
- **Queries:** session events (`ORDER BY timestamp ASC`), prior-session most-common type, prior
  distinct types. Computes error flag, causal depth, new types, duration. Index: `idx_events_session`.

### Inputs
| Input | R/O | Validation | Example | Error handling |
|---|---|---|---|---|
| `session_id` (path) | **R** | any string | `why-demo-session-001` | unknown → **404 "Session not found"** ✓ |

### Outputs
`{ session_id, agent, event_count, event_types{type:count}, causal_depth, has_errors,
duration_seconds, new_event_types[], top_events[5], summary }` ✓
Human summary verified: *"Session with agent 'why-demo-bot': 4 events over 2s. Most frequent:
user_message (1x)… Errors were detected."*

---

## 1.5 Memory Context (SDK-only today)

### Purpose
- **Why:** assemble a **token-budgeted memory block** (recent + semantically relevant events) to
  inject into an agent's prompt.
- **Problem solved:** give agents relevant past context without stuffing the whole history.
- **Value:** memory-injection; improves agent decisions.

### Backend flow
- **API:** `POST /v1/memory/context` (`memory.py::get_context`). ✓ **Requires embeddings** (400 if
  unset). Recent SQL + Qdrant semantic (best-effort) → merged, deduped, formatted text block.

### Inputs
| Input | R/O | Example | Notes |
|---|---|---|---|
| `agent` | **R** | `"support-bot"` | — |
| `task` | **R** | `"handle refund"` | embedded for semantic recall |
| `max_tokens` | O | `2000` | char budget = `max_tokens*4` |
| `session_id` | O | — | excludes the current session |
| `recent_limit`/`semantic_limit` | O | `10`/`10` | — |

### Outputs
`{ context: str, event_count, estimated_tokens, sources: [{event_id, event, timestamp, relevance,
source:"recent"|"semantic"}] }`. **No dashboard UI** — SDK `context_for()` only (gap G8).

---

## 1.6 Events Query

- **Purpose:** filtered, paginated list of an agent's events (the raw log). **Entry:** agent detail →
  **Events** tab (type-filter pills, load-more).
- **API:** `GET /v1/events` (`events.py::query_events`). ✓
- **Inputs:** `agent` **R** (missing → 422 ✓); optional `event_type` ✓, `session_id` ✓,
  `before`/`after` (ISO; bad → 422 ✓), `limit` (≤1000, def 50), `offset` (≥0).
- **Output:** array of the 8-field event shape (`_format_event`). Index: `idx_events_agent_time`.

## 1.7 Baseline / Behavior Change

- **Purpose:** detect **behavioral drift** — silent changes in what an agent does or how often it
  errors — via an L1 distance over event-type distribution + transition graph between recent and
  older sessions. **Entry:** agent detail → **Behavior** tab.
- **API:** `GET /v1/agents/{id}/baseline?recent_window=&window=` and `/behavior-change`. ✓
- **Inputs:** `recent_window` O (5–500, def 50); `window` O (`24h|7d|30d`).
- **Output (3 states):** `insufficient_data` / `warming_up` / `ok{drift{score, verdict,
  biggest_changes}, baseline, recent}`. **⚠ Verified:** needs **> recent_window sessions** — live
  message *"Need at least 51 sessions… You have 4."*; drift rarely triggers for real users (gap G/B4).

## 1.8 Forget (GDPR, SDK-only)

- **Purpose:** delete events matching `data[key]==value` from Postgres **and** Qdrant.
- **API:** `DELETE /v1/memory/forget {filter_key, filter_value}`. Output `{deleted_events, filter,
  message}`; no match → `{deleted_events:0}` (200). **No dashboard UI** (gap G8).

## Supporting: Agents list `/v1/agents`, Stats `/v1/agents/{id}/stats`, Sessions
`/v1/agents/{id}/sessions` — power the agent-detail chrome (StatsRow, Sessions list). ✓

---

# 2. Current architecture analysis (Deliverable 2)

- **Data model:** append-only `events` (`event_id UUID PK`, `parent_event_id` self-FK, `agent_id`,
  `tenant_id`, `session_id`, `event_type`, `data JSONB`, `embedding vector(1536)`, `sequence_no
  BIGSERIAL` global-monotonic, `checksum`, `metadata`). Indexes: `(tenant,agent,timestamp DESC)`,
  partial `(parent_event_id)`, partial `(tenant,session,timestamp ASC)`, `(tenant,event_type,
  timestamp DESC)`, GIN on `data`, HNSW on `embedding`. Qdrant mirrors vectors; Redis caches
  embeddings (24 h).
- **Write path:** `services/event_write.py` — upsert agent, checksum, insert, best-effort embed +
  Qdrant upsert, best-effort usage meter.
- **Auth:** tenant isolation is the hard boundary (every query filters `tenant_id`); scoped API keys
  add per-agent isolation via `assert_agent_allowed` — **but `why`/`memory` skip it** (gap G5).
- **Dashboard:** Next.js client pages; all calls via `lib/api.ts::apiFetch`; **no shared
  loading/empty/error/JSON/timeline primitives** — each screen rolls its own; the causal timeline
  exists twice (standalone vs agent-panel). A centralized `services/rate_limiter.py` now exists.

---

# 3. User journey documentation (Deliverable 3) — summary table

| Feature | Where | Required input | Optional | Result |
|---|---|---|---|---|
| Causal Trace | Debugging → Causal Trace | Event ID | Parent ID | root-cause timeline |
| Time Travel | agent → Time Travel tab | Timestamp | — | reconstructed state |
| Search | Search page / agent inline | Query | agent | ranked hits + score |
| Session Insights | agent → Sessions tab | (pick session) | — | session summary + new types |
| Events | agent → Events tab | (agent implicit) | type/session/before/after | event list |
| Behavior | agent → Behavior tab | — | window | drift verdict |
| Memory Context | *SDK only* | agent, task | tokens, session | context block |
| Forget | *SDK only* | key, value | — | deleted count |

---

# 4. Input / output mapping (Deliverable 4)

**Every input in the system:** `event_id`, `parent_id`, `agent`, `session_id`, `timestamp`,
`before`/`after` (date range), `depth`, `event_type`, `limit`/`offset`, `query` (NL), `task` (NL),
`window` (enum), `from_ts`/`to_ts`, `recent_window`, `filter_key`/`filter_value`. Validation =
UUID/regex/enum/pydantic; errors = `not_found`(404)/`bad_request`(400)/422.

**Every output produced today:** causal chain, reconstructed state, ranked search hits + score,
session diff (type histogram, new types, causal depth, error flag, duration, summary), memory
context block + sources, drift score/verdict/biggest-changes, event list, agent stats.
**Not produced (→ new features):** downstream/impact chain, error clusters, related events,
suggested fixes, NL answers, confidence beyond search score.

---

# 5. Backend execution flow (Deliverable 5)
Representative traces are in §1.1–1.8 (API → service → SQL/Qdrant → shape). Common pattern:
`Depends(get_tenant)` → validate → `get_pool()` asyncpg query (tenant-filtered) → `_format_event`
→ JSON. Search/context add an OpenAI embed + Qdrant ANN. All timestamps returned as ISO strings.

---

# 6. UX review (Phase 2 / Deliverable 6)

**Verified problems (some already fixed — marked ✅ shipped):**
- **Discoverability (High):** the Debugging nav has **one** child (Causal Trace). Time Travel,
  Session Insights, agent-Search are buried in agent-detail tabs; Memory Context & Forget have **no
  UI**. Users can't find the marquee capabilities.
- ✅ **Search hid its error (High):** the "embeddings not configured" 400 was swallowed → "No
  results". **Fixed** — now a setup state linking to Settings → Embeddings.
- ✅ **Time Travel confusing output (High):** `{_last_event}` looked broken. **Fixed** — explainer
  added for the no-`STATE_SET` case.
- ✅ **Behavior empty-state (Med):** raw "need 51 sessions". **Fixed** — now explains what drift
  tracking is and when it turns on.
- **No shared primitives (Med):** inconsistent loading/empty/error copy across ~5 screens; two
  causal timelines; duplicated search normalization.
- **Naming (Low):** "Memory Diff" is jargon → **"Session Insights"**.

**Missing states audit (per screen):** Causal Trace = all 4 states ✓ (reference). Search = now has
loading/empty/**error**/success ✅. Time Travel = has loading/result; empty/error thin (improved).
Behavior = has 3 data states ✓. Events = loading/empty ✓, error thin.

**By persona:**
- *Beginners / non-technical:* need agent→event/session **pickers** (no raw UUIDs), plain labels,
  guided empty states.
- *Developers:* UUID-first + deep-link/copy is right (Causal Trace nails it).
- *DevOps / AI engineers:* want cross-agent error triage, drift alerts, downstream impact — absent.

---

# 7. Gap analysis (Phase 3 / Deliverable 7)

| Gap | Type | Value | Effort | Impact |
|---|---|---|---|---|
| G1 Debugging tools not discoverable (buried / SDK-only) | UX | High | Low–Med | High |
| G2 No **downstream/impact** trace ("what did this cause?") | Capability | High | Med | High |
| G3 No **cross-agent error view** / clustering | Capability | High | Med | High |
| ✅G4 Search hid embeddings-not-configured error | Bug | High | Low | Med *(shipped)* |
| G5 `why`/`memory` skip `assert_agent_allowed` (scoped keys cross agents) | Security | Med | Low | Med |
| G6 No **NL "ask"** interface | Capability | High | High | High |
| G7 No **related events** on an event | Capability | Med | Med | Med |
| G8 No UI for Memory Context / Forget | UX | Med | Low–Med | Med |
| G9 **No unit tests** for why/at/search/memory/agents handlers | Quality | High | Med | High |
| G10 Duplicated timeline/search code; no shared UI primitives | Tech debt | Med | Med | Med |
| G11 Embeddings cache key `hash(text)` non-stable → cache ~useless | Perf | Med | Low | Med |
| ✅G/B3,B4 Time-Travel/Behavior empty-state clarity | UX | High | Low | Med *(shipped)* |

Prioritization drivers: **user value** (root-cause & error triage highest), **effort** (surfacing
existing endpoints < new endpoints < LLM features), **business impact** (debuggability is the
product), **feasibility** (all reuse existing schema/indexes).

---

# 8. New feature recommendations (Phase 4 / Deliverable 8)

## F1 — Unified Debugging Hub
**Problem:** the product's debugging power is hidden; only Causal Trace is a real page.
**Why needed:** highest value-to-effort — no new backend; fixes discoverability (G1) + consistency
(G10) + surfaces Memory Context/Forget (G8).
**User inputs:** none for the hub; each tool keeps its inputs, now with **agent/event/session
pickers** so no UUID pasting. *NL examples:* n/a (navigation).
**System processing:** pure UI. Reuse `getWhyChain`, `timeTravel`, `searchEvents`, `getMemoryDiff`,
+ new `getMemoryContext` client fn. Extract shared `EmptyState/ErrorState/JsonBlock/CausalTimeline/
EventPicker/AgentPicker` under `components/debugging/`.
**Expected output:** `/dashboard/debugging` landing with cards → standalone `at/`, `session-insights/`,
`search/`, `context/` pages, each with the four states + pickers.
**UI/UX flow:** entry = Debugging nav (grows 1→~6 children); form = Causal-Trace pattern; all four
states; deep-linkable.
**API design:** none new (add `getMemoryContext` wrapper for `POST /v1/memory/context`).
**DB:** none. **Security:** unchanged (dashboard JWT tenant-wide). **Use cases:** an engineer opens
Debugging and self-serves any tool without knowing IDs. **Future:** saved investigations, cross-tool
"open this event in Impact Trace".

## F2 — Impact Trace (downstream / "what did this cause?")
**Problem:** `why` only walks ancestors; you can't see an event's blast radius.
**Why needed:** completes the causal picture (why = up, impact = down); high debugging value.
**User inputs:** **R** `event_id`; **O** `depth` (≤50), `agent`. *NL:* "what did this tool_call lead to?"
**System processing:** `WITH RECURSIVE` walking **forward**: anchor `event_id=$1 AND tenant_id=$2`,
recurse `JOIN ON e.parent_event_id = cc.event_id`, bounded by depth **and** node count.
**Expected output:** a downstream **tree** (fan-out, not a single chain) with error leaves flagged +
counts ("led to 3 tool calls, 1 failure").
**UI/UX flow:** new page (mirrors Causal Trace); render indented tree/mini-DAG; loading/empty/error/
success; "trace impact from here".
**API design:** `GET /v1/events/{id}/impact?depth=` → `{event_id, node_count, tree:[{…event…,
children:[…]}]}`.
**DB:** reuse `idx_events_parent`; cap depth+nodes to bound wide graphs.
**Security:** `get_tenant` + `assert_agent_allowed` (do it right here; backfill on `why`). Rate-limit
via `services/rate_limiter.py` if needed.
**Use cases:** "this bad decision — what downstream actions did it trigger before we caught it?"
**Future:** merge up+down into one bidirectional causal graph view.

## F3 — Error Explorer
**Problem:** no single place to see/triage all failures across agents.
**Why needed:** turns scattered error events into a triage queue → root cause in one click.
**User inputs:** **O** `agent`, `window` (`24h|7d|30d`), `event_type`, `session_id`. *NL:* "show me
all failures in the last 24h".
**System processing:** query `events WHERE tenant_id=$1 AND (event_type ILIKE '%error%' OR ILIKE
'%fail%' OR data ? 'error')` within window, grouped by `event_type` (opt. `data->>'error'`), with
counts + affected agents/sessions + sample ids; optional semantic clustering later via embeddings.
**Expected output:** ranked error groups → per-group instances → one-click **Causal Trace** &
**Impact Trace**.
**UI/UX:** new page; filters; group list → drill-in; all four states.
**API design:** `GET /v1/errors?agent=&window=&event_type=` → `{groups:[{signature, count, agents[],
sessions[], first_seen, last_seen, sample_event_ids[]}]}`.
**DB:** uses `idx_events_type`; add a partial index on error events only if volume warrants.
**Security:** `get_tenant`; scoped keys restricted to their agent; rate-limit. **Use cases:** morning
triage of overnight failures. **Future:** alerting/webhooks on new error signatures.

## F4 — "Ask ZizkaDB" (natural-language debugging) — bigger bet
**Problem:** users must know which tool + which IDs; non-technical users can't self-serve.
**Why needed:** collapses the whole toolset into one NL box; maximal accessibility/transparency.
**User inputs:** **R** `question`; **O** `agent`, time hint. *NL:* "why did the refund agent fail last
night?", "what changed in support-bot this week?".
**System processing:** an LLM router maps the question to existing endpoints (search → find candidate
event → why/impact/at/diff), then summarizes the **structured** results in prose with citations —
strictly grounded (no invented events).
**Expected output:** `{answer, citations:[event_id], used_tools:[…], results:{…}, confidence}` +
"open in Causal Trace" deep links.
**UI/UX:** single ask box; streaming answer; loading/empty/error/success; shows the underlying
structured evidence.
**API design:** `POST /v1/ask {question, agent?}`.
**DB:** none new. **Security:** `get_tenant`, strict tenant scoping on every sub-query, **rate-limited
via `services/rate_limiter.py`** (LLM cost), redact sensitive `data`. **Use cases:** a PM asks a
plain-English question and gets a cited answer. **Future:** saved investigations, scheduled digests.

## F5–F7 (brief)
- **F5 Related Events** — on any event: semantic neighbors (search) + session siblings + direct
  children. Med/Med. **F6 Session Replay** — full session as a causal timeline (richer than the
  diff). Med/Med. **F7 Suggested Fixes** — for an error, semantic-search past *resolved* similar
  errors and surface what unblocked them. Med value / High effort. All reuse existing endpoints.

---

# 9. Technical implementation plan (Deliverable 9)
- **New endpoints:** `GET /v1/events/{id}/impact` (F2), `GET /v1/errors` (F3), `POST /v1/ask` (F4).
  All: `Depends(get_tenant)` + `assert_agent_allowed` where per-agent; `get_pool()`; raise via
  `core/services/exceptions.py`; bounded recursion/limits; `_format_event` shape.
- **Security backfill (G5):** add `assert_agent_allowed` to `why`, `memory/diff|context`, `forget`.
- **Dashboard:** extract shared `components/debugging/*` primitives; build F1 hub + standalone pages;
  retire the duplicate `WhyPanel`/normalization.
- **Client (`lib/api.ts`):** add `getImpactChain`, `getErrors`, `ask`, `getMemoryContext`.
- **Docs:** update `dashboard/DASHBOARD_KNOWLEDGE_BASE.md` §17.3/§19 and `core/CLAUDE.md` router map.

# 10. API recommendations (Deliverable 10)
Consistent envelopes reusing `_format_event`; `assert_agent_allowed` on every per-agent route; stay
on `/v1`; rate-limit `/ask` (LLM) and `/search` (embeddings) via the existing limiter; keep
optional-param + `bad_request`/`not_found` conventions.

# 11. Database recommendations (Deliverable 11)
No schema change for F2/F3 (existing `idx_events_parent`, `idx_events_type`, GIN on `data` suffice).
**Fix G11** (embeddings cache key `hash()`→`sha256`). Bound all recursive CTEs by depth **and** node
count. Consider a partial error index only if Error Explorer volume is high.

# 12. Security considerations (Deliverable 12)
Close G5 (agent-scope on why/memory); tenant filter remains the hard boundary. Rate-limit LLM/
embedding endpoints. Redact sensitive `data` in `/ask`. `forget` already deletes Postgres + Qdrant.
No raw user SQL — parameterized queries + allowlisted enums only.

---

# 13. Comprehensive testing plan (Phase 5 / Deliverable 13)

**Close G9 first — there are currently NO unit tests for why/at/search/memory/agents handlers.**

## Unit tests (mocked pool, per handler)
- **Valid inputs:** happy-path response shape for why/at/search/diff/context/events/baseline.
- **Invalid inputs:** non-UUID event/session → 404/400; bad datetime → 422; out-of-range depth.
- **Edge cases:** `chain_length==1` (root event); Time-Travel STATE_SET vs `_last_event` case;
  multi-error chain (root cause = earliest); forget no-match → 0.
- **Empty values:** empty `data {}`; no results; empty session.
- **Null values:** null `parent_id`/`session_id`; missing optional params.
- New files: `test_why.py`, `test_time_travel.py`, `test_search.py`, `test_memory.py`,
  `test_events_query.py`, `test_agents_analytics.py`, `test_impact.py`, `test_errors.py`.

## Integration tests (API + DB + service)
- Seed a known chain + sessions; assert **contents** (chain order/depth, reconstructed state, diff
  fields, drift math) — not just HTTP 200 (current integration tests only check status/key-presence).
- Search/context: run with embeddings configured; assert ranking + hydration.

## End-to-end tests (dashboard workflows)
- Each debugging page: deep-link load, picker flow, the four states (esp. Search-not-configured,
  Time-Travel-no-state), copy/share, "trace from here", mobile.

## Performance tests
- Depth-50 chains; wide impact fan-out (assert node cap); large sessions; concurrent `/search` &
  `/ask`; assert p95 latency + bounded recursion.

## Security tests
- Scoped-key cross-agent attempts → **403** on every per-agent route (after G5 fix); injection via
  `event_type`/`session_id`/`filter_key`/`question`; rate-limit enforcement on `/search` & `/ask`;
  unauthorized (no/invalid token) → 401.

## UX tests
- Accessibility (labels/focus — Causal Trace added `htmlFor`/`aria`), keyboard nav, mobile
  responsiveness, error-message clarity, loading experience.

## Acceptance criteria (examples)
- **Impact Trace:** given seeded A→B→C, `impact(A)` returns B & C with correct parent links, error
  leaves flagged, bounded by depth; scoped key for another agent → 403; page shows tree + all four
  states; unit + integration green.
- **Search fix (done):** with embeddings unset, the page shows the setup state (not "No results");
  with embeddings set, ranked hits render. ✅
- **Time Travel (done):** no-STATE_SET agent shows the explainer; STATE_SET agent shows the dict. ✅

---

# 14. Risks & trade-offs (Deliverable 14)
- **F4 "Ask"**: LLM cost/latency + hallucination risk → strict grounding, citations, rate limits;
  ship F1–F3 first (no LLM).
- Adding `assert_agent_allowed` to `why`/`memory` could change behavior for any existing scoped-key
  integration relying on cross-agent reads — low risk, but flag in release notes.
- Impact/error queries can fan out → hard caps required.
- Shared-component refactor touches the 2,195-line agent-detail page → do it incrementally.

---

# 15. Final implementation roadmap (Deliverable 15)

**HIGH (do first — verified problems, high value, no LLM):**
1. ✅ **Clarity fixes** — Search error state, Time Travel explainer, Behavior copy *(shipped)*.
2. **F1 Unified Debugging Hub** + shared primitives (G10) + pickers (G1/G8).
3. **F2 Impact Trace** endpoint + page (G2).
4. **G5** agent-scope hardening; **G11** embeddings cache-key fix.
5. **G9** unit tests for existing handlers.

**MEDIUM:**
6. **F3 Error Explorer** (G3).
7. Memory Context preview + Forget UI (G8); rename "Memory Diff" → "Session Insights".
8. **F5/F7** Related Events + Suggested Fixes.

**LOW / bigger bets:**
9. **F4 "Ask ZizkaDB"** NL debugging (after F1–F3).
10. **F6** Session Replay; confidence scores on results (G12).

---

*Prepared from a full read of `core/api/{events,search,memory,agents}.py`, `core/services/*`,
`core/db/schema.sql`, `sdk/python/zizkadb/*`, `dashboard/app/dashboard/*`, plus live verification
against the running stack. The three HIGH-tier clarity fixes are already implemented and pushed
(branch `feat/dashboard-why-page`).*
