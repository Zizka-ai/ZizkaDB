# AI-assisted development in ZizkaDB

How this repository encodes coding standards so **Cursor, Claude Code, GitHub Copilot, Windsurf, and other AI tools** follow the same rules without repeating prompts.

**Rationale:** [ADR-008 — AI coding assistant architecture](../adr/008-ai-coding-assistant-architecture.md)

---

## You do not need to paste standards into every chat

Clone the repo and work inside it. These files load automatically (or are one `@` away):

| Layer | Files | When loaded |
|-------|-------|-------------|
| **0 — Discovery** | [`AGENTS.md`](../../AGENTS.md) | Any AI tool at repo root |
| **1 — Always on** | [`docs/ai/CODING_PRINCIPLES.md`](CODING_PRINCIPLES.md), [`.cursor/rules/coding-standards.mdc`](../../.cursor/rules/coding-standards.mdc), [`.cursor/rules/ai-knowledge-base.mdc`](../../.cursor/rules/ai-knowledge-base.mdc) | Every Cursor session; referenced by Copilot |
| **2 — By path** | `.cursor/rules/*.mdc` (globs) | When editing matching paths |
| **3 — Deep reference** | Module `CLAUDE.md`, `DASHBOARD_KNOWLEDGE_BASE.md`, `docs/adr/` | On demand |
| **4 — Hard enforcement** | ruff, eslint, vitest, GitHub Actions | Every PR — not optional |

---

## Tool adapter map

| Tool | Entry file | Notes |
|------|------------|-------|
| **Cursor** | `.cursor/rules/*.mdc` | `alwaysApply: true` on standards + KB index |
| **Claude Code** | `CLAUDE.md`, `AGENTS.md` | Module `CLAUDE.md` per directory |
| **GitHub Copilot** | `.github/copilot-instructions.md` | Points to Layer 1 |
| **Windsurf** | `.windsurfrules` | Pointer to `AGENTS.md` |
| **Gemini (IDE)** | `GEMINI.md` | Pointer to `AGENTS.md` |
| **Any agent** | `AGENTS.md` | Start here |

---

## Cursor rules (`.cursor/rules/`)

| File | Scope |
|------|-------|
| `coding-standards.mdc` | Always — ZizkaDB invariants, git workflow, PR rules |
| `ai-knowledge-base.mdc` | Always — doc index, OSS scope |
| `core-backend.mdc` | `core/**` |
| `backend-dashboard-contract.mdc` | `core/api/**`, `core/services/**`, `core/db/**` |
| `dashboard.mdc` | `dashboard/**` |
| `sdk-integrations-mcp.mdc` | `sdk/**`, `integrations/**`, `mcp/**`, `examples/**` |
| `testing.mdc` | tests, `conftest.py`, `pytest.ini` |
| `infra-deploy.mdc` | `infra/**`, `scripts/**`, `.github/**` |
| `enterprise-page-knowledge-base.mdc` | Enterprise marketing surfaces |

**Skills** (workflows, not always injected): `.cursor/skills/zizkadb-dev-setup/`, `zizkadb-test/`, `zizkadb-release/`.

---

## Module guides (`CLAUDE.md`)

| Path | Focus |
|------|-------|
| [`CLAUDE.md`](../../CLAUDE.md) | Stack, invariants, test commands |
| [`core/CLAUDE.md`](../../core/CLAUDE.md) | Routers, auth tree, services |
| [`dashboard/CLAUDE.md`](../../dashboard/CLAUDE.md) | Next.js conventions |
| [`sdk/python/CLAUDE.md`](../../sdk/python/CLAUDE.md) | Python SDK |
| [`sdk/typescript/CLAUDE.md`](../../sdk/typescript/CLAUDE.md) | TypeScript SDK |
| [`integrations/CLAUDE.md`](../../integrations/CLAUDE.md) | LangChain, CrewAI, LiveKit |
| [`mcp/CLAUDE.md`](../../mcp/CLAUDE.md) | MCP server (MIT) |
| [`examples/CLAUDE.md`](../../examples/CLAUDE.md) | Runnable examples |

---

## Maintenance checklist

When you change…

| Change | Also update |
|--------|-------------|
| Universal engineering bar | `docs/ai/CODING_PRINCIPLES.md` |
| ZizkaDB invariants | `.cursor/rules/coding-standards.mdc` |
| New rule file or glob | This README + `AGENTS.md` |
| Product architecture “why” | `docs/adr/` |
| AI system design | ADR-008 + this README |

**Quarterly:** sweep `core/README.md`, router mounts in `core/main.py`, and ADR index for drift.

---

## Implementation status

| Phase | Status |
|-------|--------|
| Canonical `docs/ai/` layer | Done |
| Stale doc fixes (`core/README`, ADR index, OSS admin refs) | Done |
| `examples/CLAUDE.md` | Done |
| `CONTRIBUTING.md` AI section | Done |
| `.editorconfig` | Done |
| `pre-commit` hooks | Done — `.pre-commit-config.yaml` |
| CI doc drift checker | Done — `scripts/check-doc-drift.sh` in CI + pre-commit |
