# AGENTS.md — guidance for AI coding tools

This file helps Cursor, Copilot, Claude Code, and other agents work on **this repository**.

## Start here

| Resource | Use for |
|----------|---------|
| [CLAUDE.md](CLAUDE.md) | Project stack, invariants, test commands |
| [.cursor/rules/coding-standards.mdc](.cursor/rules/coding-standards.mdc) | Always-on auth, entitlements, cross-cutting rules |
| [.cursor/rules/ai-knowledge-base.mdc](.cursor/rules/ai-knowledge-base.mdc) | Doc index + OSS scope |
| [docs/README.md](docs/README.md) | Human + agent documentation map |
| [dashboard/DASHBOARD_KNOWLEDGE_BASE.md](dashboard/DASHBOARD_KNOWLEDGE_BASE.md) | Dashboard flows and API contract |

Area-specific rules load automatically from `.cursor/rules/*.mdc` by file path.

## Critical invariants

1. **Auth:** SDK routes → `get_tenant`; dashboard management → `require_dashboard_session`; per-agent routes → `assert_agent_allowed`.
2. **Never rename `/v1/` paths** without updating `dashboard/lib/api.ts`.
3. **Plan caps:** only in `core/services/entitlements.py::PLAN_ENTITLEMENTS`.
4. **Schema DDL:** idempotent only (`IF NOT EXISTS`).
5. **No admin console in OSS** — do not add `/v1/admin` or `/admin` routes here.

## Tests before PR

```bash
ruff check core/ sdk/python/ mcp/ integrations/
pytest core/tests/ -m "not integration" -v
cd dashboard && npm run lint && npm test && npm run build
```

When opening a PR, set **all** GitHub links in the same `gh pr create`: `--label` (`enhancement` / `bug` / `documentation`), `--assignee saadamjad`, `--reviewer Zizka-ai`, and `Closes #N` (or `Related to #N` if the issue must stay open). Do not leave labels, assignee, reviewer, or issue linking for a follow-up edit.

See [.cursor/skills/zizkadb-test/SKILL.md](.cursor/skills/zizkadb-test/SKILL.md).

## Integrating ZizkaDB into user agents (product)

For **using** ZizkaDB as a product (not hacking this repo), point users to:

- [CONNECT.md](CONNECT.md)
- [docs/integrate/any-agent.md](docs/integrate/any-agent.md)
