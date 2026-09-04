## Summary

<!-- What changed? (CODING_STANDARDS §39) -->

## Why

<!-- Why was this necessary? -->

## Implementation

<!-- How was it implemented? Keep it brief. -->

## Test plan

- [ ] `ruff check …` (if Python touched)
- [ ] `pytest core/tests/ -m "not integration"` (if core touched)
- [ ] `cd dashboard && npm run lint && npm test && npm run build` (if dashboard touched)
- [ ] `bash scripts/check-doc-drift.sh` (if routers / `docs/ai/` / rules touched)
- [ ] Manual: <!-- steps or "docs only" -->

## Edge cases

<!-- Empty, error, loading, auth, concurrency — §20 -->

## Security

<!-- Secrets, auth, input validation — §23–24; "N/A" for docs-only -->

## Performance

<!-- DB queries, renders, cache — §19; "N/A" if not relevant -->

## Documentation

<!-- KB, ADR, CODING_STANDARDS, lib/api.ts — §34 -->

## Breaking changes

<!-- None, or describe migration — §31 -->

## Related issue

Fixes #<!-- number --> or Related to #<!-- number -->

<!-- Maintainers: docs/ai/MAINTAINER.md for labels and assignee -->
