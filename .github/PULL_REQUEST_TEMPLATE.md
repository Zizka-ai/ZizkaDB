## What does this PR do?

<!-- One paragraph or bullet list explaining the change -->

## How to test

<!-- Steps for the reviewer to verify -->

## Checklist

- [ ] Tests pass (`pytest core/tests/ -m "not integration" -v`)
- [ ] Lint passes (`ruff check core/ sdk/python/ mcp/ integrations/`)
- [ ] Dashboard builds (`cd dashboard && npm run lint && npm run build`)
- [ ] No new `allow_origins=["*"]` + `allow_credentials=True` combinations
- [ ] Schema changes are idempotent (`IF NOT EXISTS` / `IF EXISTS`)
- [ ] Auth dependency is correct (`get_tenant` vs `require_dashboard_session`)
- [ ] Per-agent analytics routes call `assert_agent_allowed()`
- [ ] Plan limits only live in `PLAN_ENTITLEMENTS` (`core/services/entitlements.py`)
- [ ] `CHANGELOG.md` updated under `[Unreleased]` if user-facing or security-relevant
