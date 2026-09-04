# AI-assisted development in ZizkaDB

How coding standards are encoded for **Cursor, Claude Code, Copilot, Windsurf, and other AI tools**.

**Rationale:** [ADR-008 — AI coding assistant architecture](../adr/008-ai-coding-assistant-architecture.md)

---

## You do not need to paste standards into every chat

| Layer | Files | When loaded |
|-------|-------|-------------|
| **0 — Discovery** | [`AGENTS.md`](../../AGENTS.md) | Any AI tool at repo root |
| **1 — Always on (Cursor)** | [`ai-workflow.mdc`](../../.cursor/rules/ai-workflow.mdc), [`coding-standards.mdc`](../../.cursor/rules/coding-standards.mdc), [`ai-knowledge-base.mdc`](../../.cursor/rules/ai-knowledge-base.mdc) | Every Cursor session (~70 lines total) |
| **1b — Full standards** | [`CODING_STANDARDS.md`](CODING_STANDARDS.md) (44 sections) | Read on demand — canonical team doc |
| **1c — Repo map** | [`ZIZKADB_MAPPINGS.md`](ZIZKADB_MAPPINGS.md) | How generic rules map to our folders |
| **2 — By path** | `.cursor/rules/*.mdc` globs | When editing matching paths |
| **3 — Deep reference** | Module `CLAUDE.md`, `DASHBOARD_KNOWLEDGE_BASE.md`, `docs/adr/` | On demand |
| **4 — Hard enforcement** | ruff, eslint, vitest, CI, `check-doc-drift.sh` | Every PR |

**Always-on budget:** keep the three `alwaysApply` `.mdc` files under ~80 lines combined; put depth in `CODING_STANDARDS.md`.

---

## Tool adapter map

| Tool | Entry file |
|------|------------|
| **Any agent** | [`AGENTS.md`](../../AGENTS.md) |
| **Maintainers** | [`MAINTAINER.md`](MAINTAINER.md) |
| **Cursor** | `.cursor/rules/*.mdc` |
| **Claude Code** | `CLAUDE.md`, `AGENTS.md` |
| **GitHub Copilot** | `.github/copilot-instructions.md` |
| **Windsurf** | `.windsurfrules` |
| **Gemini** | `GEMINI.md` |

---

## Cursor rules

| File | Scope |
|------|-------|
| `ai-workflow.mdc` | Always — lifecycle, must-not, definition of done |
| `coding-standards.mdc` | Always — ZizkaDB invariants |
| `ai-knowledge-base.mdc` | Always — doc index |
| `core-backend.mdc` | `core/**` |
| `backend-dashboard-contract.mdc` | `core/api/**`, `services/**`, `db/**` |
| `dashboard.mdc` | `dashboard/**` |
| `sdk-integrations-mcp.mdc` | `sdk/**`, `integrations/**`, `mcp/**`, `examples/**` |
| `testing.mdc` | tests |
| `infra-deploy.mdc` | `infra/**`, `scripts/**`, `.github/**` |
| `enterprise-page-knowledge-base.mdc` | Enterprise marketing |

---

## Maintenance

| Change | Update |
|--------|--------|
| Team engineering bar | `CODING_STANDARDS.md` |
| Repo folder mapping | `ZIZKADB_MAPPINGS.md` |
| ZizkaDB invariants | `coding-standards.mdc` |
| New rule / glob | This README + `AGENTS.md` |

---

## Security (self-host)

No real API keys in committed code. Before public deploy: `ENV=production`, strong `JWT_SECRET`, unset `DEV_API_KEY`, `NEXT_PUBLIC_DEV_MODE=false`. Run `bash scripts/validate-selfhost-config.sh`.

---

## Status

| Item | Status |
|------|--------|
| `CODING_STANDARDS.md` (44 sections) | Done |
| `ZIZKADB_MAPPINGS.md` | Done |
| `ai-workflow.mdc` | Done |
| Slim `coding-standards.mdc` | Done |
| Pre-commit + doc drift CI | Done |
