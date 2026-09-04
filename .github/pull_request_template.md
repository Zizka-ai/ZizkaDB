## Summary

<!-- What changed and why (1–3 bullets). -->

## Test plan

- [ ] `ruff check core/ sdk/python/ mcp/ integrations/` (if Python touched)
- [ ] `pytest core/tests/ -m "not integration"` (if core touched)
- [ ] `cd dashboard && npm run lint && npm test && npm run build` (if dashboard touched)
- [ ] `bash scripts/check-doc-drift.sh` (if routers, `AGENTS.md`, or `docs/ai/` touched)
- [ ] Manual: <!-- steps or "docs only" -->

## Areas touched

- [ ] API / schema
- [ ] SDK (Python / TypeScript)
- [ ] Dashboard
- [ ] MCP / integrations
- [ ] Docs / AI rules (`AGENTS.md`, `docs/ai/`, `.cursor/rules/`)
- [ ] Infra / CI

## Docs & AI standards

- [ ] Updated canonical docs if behavior changed (KB, ADR, `lib/api.ts`, module `CLAUDE.md`)
- [ ] `bash scripts/check-doc-drift.sh` passes when router or AI doc files changed

## Breaking changes

<!-- None, or describe migration. -->

Fixes #<!-- issue number if applicable -->

<!-- Maintainers: see docs/ai/MAINTAINER.md for assignee, reviewer, and label conventions. -->
