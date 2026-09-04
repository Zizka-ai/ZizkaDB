# AGENTS.md — guidance for AI coding tools

Repo-root entry for Cursor, Claude Code, Copilot, Windsurf, Gemini, and other agents.

**You do not need to paste coding standards into every prompt** — read the files below.

---

## Read first (in order)

| # | Resource | Role |
|---|----------|------|
| 1 | [docs/ai/CODING_STANDARDS.md](docs/ai/CODING_STANDARDS.md) | Full team standards (44 sections) |
| 2 | [docs/ai/ZIZKADB_MAPPINGS.md](docs/ai/ZIZKADB_MAPPINGS.md) | How standards map to this repo |
| 3 | [.cursor/rules/ai-workflow.mdc](.cursor/rules/ai-workflow.mdc) | Always-on AI lifecycle (Cursor) |
| 4 | [.cursor/rules/coding-standards.mdc](.cursor/rules/coding-standards.mdc) | ZizkaDB invariants (Cursor) |
| 5 | [CLAUDE.md](CLAUDE.md) | Stack and module map |

Map: [docs/ai/README.md](docs/ai/README.md) · ADR: [docs/adr/008-ai-coding-assistant-architecture.md](docs/adr/008-ai-coding-assistant-architecture.md)

---

## Tool adapters

| Tool | Entry |
|------|-------|
| Cursor | `.cursor/rules/*.mdc` (`alwaysApply` + globs) |
| Claude Code | `CLAUDE.md` + this file |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Gemini | `GEMINI.md` |

---

## Module guides

| Area | Read |
|------|------|
| `core/` | [core/CLAUDE.md](core/CLAUDE.md) |
| `dashboard/` | [dashboard/CLAUDE.md](dashboard/CLAUDE.md) · [DASHBOARD_KNOWLEDGE_BASE.md](dashboard/DASHBOARD_KNOWLEDGE_BASE.md) |
| `sdk/python/` | [sdk/python/CLAUDE.md](sdk/python/CLAUDE.md) |
| `sdk/typescript/` | [sdk/typescript/CLAUDE.md](sdk/typescript/CLAUDE.md) |
| `integrations/` | [integrations/CLAUDE.md](integrations/CLAUDE.md) |
| `mcp/` | [mcp/CLAUDE.md](mcp/CLAUDE.md) |
| `examples/` | [examples/CLAUDE.md](examples/CLAUDE.md) |
| Tests | `.cursor/rules/testing.mdc` |

Skills: [zizkadb-dev-setup](.cursor/skills/zizkadb-dev-setup/SKILL.md) · [zizkadb-test](.cursor/skills/zizkadb-test/SKILL.md) · [zizkadb-release](.cursor/skills/zizkadb-release/SKILL.md)

---

## Before starting

```bash
git fetch origin main
git merge origin/main    # on your feature branch
git checkout -b <topic>  # if new work
```

Never `git push` to `main`. Maintainers: [docs/ai/MAINTAINER.md](docs/ai/MAINTAINER.md).

---

## Verify before PR

```bash
ruff check core/ sdk/python/ mcp/ integrations/
pytest core/tests/ -m "not integration" -v
cd dashboard && npm run lint && npm test && npm run build
```

Optional: `pre-commit install`. CI enforces the same gates.

PR: [CONTRIBUTING.md](CONTRIBUTING.md) (§39 template). Link `Fixes #N` when applicable.

---

## Product integration (not hacking this repo)

- [CONNECT.md](CONNECT.md)
- [docs/integrate/any-agent.md](docs/integrate/any-agent.md)
