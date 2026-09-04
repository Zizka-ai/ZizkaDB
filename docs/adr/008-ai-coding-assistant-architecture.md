# ADR-008: AI coding assistant architecture

**Status**: Accepted  
**Date**: 2026-03-20

---

## Context

ZizkaDB is open source. Contributors use Cursor, Claude Code, GitHub Copilot, Windsurf, and other AI-assisted IDEs. Without a repo-encoded standards system:

- Every developer repeats the same prompts (“follow best practices”, “reuse code”, “match conventions”).
- AI tools hallucinate patterns from stale README files or generic training data.
- ZizkaDB-specific invariants (auth split, entitlements, idempotent DDL) get violated in PRs.

We need a **tool-agnostic** architecture with **thin adapters per IDE** and **hard CI enforcement** as the backstop.

---

## Decision

### Four layers

1. **Discovery** — `AGENTS.md` at repo root (industry convention for AI tools).
2. **Always-on rules** — `docs/ai/CODING_STANDARDS.md` (full team standards) + `docs/ai/ZIZKADB_MAPPINGS.md` (repo map) + `.cursor/rules/ai-workflow.mdc` + `coding-standards.mdc` (invariants) + `ai-knowledge-base.mdc` (index).
3. **Path-scoped rules** — `.cursor/rules/*.mdc` with `globs` for `core/`, `dashboard/`, `sdk/`, etc.
4. **Deep reference** — module `CLAUDE.md` files, `DASHBOARD_KNOWLEDGE_BASE.md`, `docs/adr/`.

### Tool adapters (pointers only — no duplication)

| Tool | File |
|------|------|
| Cursor | `.cursor/rules/*.mdc` |
| Claude Code | `CLAUDE.md` + `AGENTS.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Windsurf | `.windsurfrules` |
| Gemini IDE | `GEMINI.md` |

Adapters **link** to canonical docs; they do not copy long invariant lists.

### Enforcement split

- **Soft:** AI rules and docs (reduce mistakes at generation time).
- **Hard:** `ruff`, dashboard `eslint`/`vitest`/`build`, `pytest`, GitHub Actions CI (block merge).

AI rules are not trusted for security or schema correctness — CI is.

### OSS scope clarity

Rules state explicitly: this tree has **no** operator admin console (`/admin`, `/v1/admin/*`). Historical KB sections referencing admin are reference-only; do not implement admin routes here.

---

## Consequences

### Easier

- New contributors get consistent AI behavior without custom prompts.
- Investors and reviewers see intentional documentation architecture (ADR + `docs/ai/`).
- Single place to update team standards (`CODING_STANDARDS.md`).

### Harder

- Doc maintenance burden: router changes must update `core/CLAUDE.md`, `core/README.md`, and KB.
- Cursor-specific `.mdc` format does not auto-load in all IDEs — adapters required.

---

## Alternatives considered

| Alternative | Why not |
|-------------|---------|
| One giant `CLAUDE.md` only | Too long for context windows; duplicates across tools |
| Cursor rules only | Copilot/Claude users miss always-on invariants |
| Prompt library in Notion/wiki | Not in-repo; AI tools do not auto-read it |
| No ADR — just rules files | No “why” for reviewers; looks accidental |

---

## References

- [`docs/ai/README.md`](../ai/README.md) — living map
- [`AGENTS.md`](../../AGENTS.md) — contributor entry
- [ADR-004](004-auth-dependency-split.md) — example of invariant AI must not break
