## Summary

<!-- What changed and why (1–3 bullets). -->

## Test plan

- [ ] `ruff check core/ sdk/python/ mcp/ integrations/` (if Python touched)
- [ ] `pytest core/tests/ -m "not integration"` (if core touched)
- [ ] `cd dashboard && npm run lint && npm test && npm run build` (if dashboard touched)
- [ ] Manual: <!-- steps or "docs only" -->

## Areas touched

- [ ] API / schema
- [ ] SDK (Python / TypeScript)
- [ ] Dashboard
- [ ] MCP / integrations
- [ ] Docs only
- [ ] Infra / CI

## Breaking changes

<!-- None, or describe migration. -->

Fixes #<!-- issue number if applicable -->
