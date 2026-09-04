# AGENTS.md — guidance for AI coding tools

This file is the **repo-root entry** for Cursor, Claude Code, GitHub Copilot, Windsurf, Gemini, and other agents working on ZizkaDB.

**You do not need to paste coding standards into every prompt** — read the files below; they load automatically or are linked from tool adapters.

---

## Read first (in order)

| # | Resource | Role |
|---|----------|------|
| 1 | [docs/ai/CODING_PRINCIPLES.md](docs/ai/CODING_PRINCIPLES.md) | Universal quality: scope, reuse, tests, security |
| 2 | [.cursor/rules/coding-standards.mdc](.cursor/rules/coding-standards.mdc) | ZizkaDB invariants (auth, DDL, entitlements, PR rules) |
| 3 | [.cursor/rules/ai-knowledge-base.mdc](.cursor/rules/ai-knowledge-base.mdc) | Doc index + OSS scope |
| 4 | [CLAUDE.md](CLAUDE.md) | Stack, module map, test commands |

Full architecture map: [docs/ai/README.md](docs/ai/README.md) · Rationale: [docs/adr/008-ai-coding-assistant-architecture.md](docs/adr/008-ai-coding-assistant-architecture.md)

---

## Tool adapters

| Tool | File |
|------|------|
| Cursor | `.cursor/rules/*.mdc` (`alwaysApply` + globs) |
| Claude Code | `CLAUDE.md` + this file |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Gemini IDE | `GEMINI.md` |

Area-specific Cursor rules load automatically by file path (e.g. `dashboard/**` → `dashboard.mdc`).

---

## Module guides

| Working in… | Read |
|-------------|------|
| `core/` | [core/CLAUDE.md](core/CLAUDE.md) |
| `dashboard/` | [dashboard/CLAUDE.md](dashboard/CLAUDE.md) · [dashboard/DASHBOARD_KNOWLEDGE_BASE.md](dashboard/DASHBOARD_KNOWLEDGE_BASE.md) |
| `sdk/python/` | [sdk/python/CLAUDE.md](sdk/python/CLAUDE.md) |
| `sdk/typescript/` | [sdk/typescript/CLAUDE.md](sdk/typescript/CLAUDE.md) |
| `integrations/` | [integrations/CLAUDE.md](integrations/CLAUDE.md) |
| `mcp/` | [mcp/CLAUDE.md](mcp/CLAUDE.md) |
| `examples/` | [examples/CLAUDE.md](examples/CLAUDE.md) |
| `infra/`, `scripts/` | `.cursor/rules/infra-deploy.mdc` |
| Tests | `.cursor/rules/testing.mdc` |

Workflow skills: [.cursor/skills/zizkadb-dev-setup/](.cursor/skills/zizkadb-dev-setup/SKILL.md) · [zizkadb-test/](.cursor/skills/zizkadb-test/SKILL.md) · [zizkadb-release/](.cursor/skills/zizkadb-release/SKILL.md)

---

## Optional: pre-commit (recommended)

Catch lint and doc drift before you push:

```bash
pip install -r core/requirements-dev.txt
pre-commit install
pre-commit run --all-files   # first-time verify
```

Hooks: ruff (Python), AI doc drift (`scripts/check-doc-drift.sh`), basic file hygiene.

---

## Before starting

```bash
git fetch origin main
git checkout -B main origin/main
```

Branch from that tip (`git checkout -b <topic>`), or merge `origin/main` into an existing PR branch. Never start from a stale local `main`. Never `git push` to `main`.

---

## Critical invariants

1. **Auth:** SDK routes → `get_tenant`; dashboard management → `require_dashboard_session`; per-agent routes → `assert_agent_allowed`.
2. **Never rename `/v1/` paths** without updating `dashboard/lib/api.ts`.
3. **Plan caps:** only in `core/services/entitlements.py::PLAN_ENTITLEMENTS`.
4. **Schema DDL:** idempotent only (`IF NOT EXISTS` / `IF EXISTS`).
5. **No admin console in OSS** — do not add `/v1/admin` or `/admin` routes here.

---

## Tests before PR

```bash
ruff check core/ sdk/python/ mcp/ integrations/
pytest core/tests/ -m "not integration" -v
cd dashboard && npm run lint && npm test && npm run build
```

When opening a PR, set **all** GitHub metadata in one `gh pr create`: `--label`, `--assignee saadamjad`, `--reviewer Zizka-ai`, `Closes #N` or `Related to #N`. Footer: **Made with [Cursor](https://cursor.com) and Saad**

See [.cursor/skills/zizkadb-test/SKILL.md](.cursor/skills/zizkadb-test/SKILL.md) for the full matrix.

---

## Integrating ZizkaDB into user agents (product)

For **using** ZizkaDB as a product (not hacking this repo):

- [CONNECT.md](CONNECT.md)
- [docs/integrate/any-agent.md](docs/integrate/any-agent.md)
