# ADR-002: Dual-Write — Events to Both Postgres and Qdrant

**Status**: Accepted  
**Date**: 2024

---

## Context

ZizkaDB needs both structured querying (filter by agent, time range, event type, session) and semantic search (find events similar in meaning to a plain-English query). These require different storage engines.

The question is: should we store embeddings in one place and use it for both, or maintain separate stores?

---

## Decision

Write every event to **both** Postgres and Qdrant:

1. **Postgres** (`events` table): source of truth for all structured data. Also stores the embedding vector in `events.embedding vector(1536)` — a portability copy.

2. **Qdrant** (`agent_events` collection): the ANN search engine. Receives the same embedding as Postgres. All `db.search()` and `db.context_for()` queries go through Qdrant.

Write order in `core/services/event_write.py`:
- Postgres insert is **primary** — must succeed for the event to be considered written
- Qdrant upsert is **secondary** — failure is logged and swallowed (non-fatal) so a Qdrant outage doesn't break event logging

```python
# core/services/event_write.py
await write_to_postgres(event)        # must succeed
try:
    await upsert_to_qdrant(event)     # best-effort
except Exception as e:
    log.warning("Qdrant write failed (non-fatal): %s", e)
```

---

## Consequences

**Better:**
- `events.embedding` in Postgres provides a complete, queryable backup of all embeddings — if Qdrant is wiped, data is not lost
- Qdrant can be rebuilt from Postgres at any time without re-calling the embedding API
- Qdrant outage doesn't break event logging — agents keep working; search degrades gracefully
- Structured queries (by type, session, time) never touch Qdrant

**Worse:**
- Two writes per event with embeddings — slightly more latency on ingestion
- `events.embedding` takes significant storage in Postgres (1536 floats × 4 bytes = ~6 KB per event)
- Qdrant and Postgres can temporarily diverge after a Qdrant failure (repaired by re-indexing from Postgres)

**Note on the Postgres HNSW index:**
`idx_events_embedding` (HNSW on `events.embedding`) is defined in `schema.sql` but is **not used for search** — all ANN queries go to Qdrant. The index exists for data portability: it allows pgvector-native ANN search as a fallback if Qdrant is ever removed. Do not remove this index without a product decision about Qdrant dependency.

---

## Alternatives considered

**Qdrant only**: no portability; Qdrant outage = data loss risk; no structured queries on embeddings.

**Postgres only (pgvector)**: pgvector HNSW search is slower than Qdrant at scale; Qdrant has better recall tuning and filtering.

**Separate embedding store (Pinecone, Weaviate)**: adds a third external dependency; harder to self-host.
