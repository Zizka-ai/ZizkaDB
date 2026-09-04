# Coding principles (all contributors + AI tools)

Universal engineering standards for **any** change in this repo. Tool-specific ZizkaDB rules live in [`.cursor/rules/coding-standards.mdc`](../../.cursor/rules/coding-standards.mdc).

---

## Scope and diff size

- Solve the task asked for — no drive-by refactors, renames, or “cleanup” in unrelated files.
- Prefer the **smallest correct diff**. A focused 10-line fix beats a 200-line rewrite.
- If you touch a file, only change what the task requires.

## Reuse before inventing

- Search for existing helpers, components, and patterns before adding new ones.
- Extend what exists (`core/api/utils.py`, `dashboard/lib/api.ts`, shared services) instead of duplicating logic.
- Match surrounding naming, imports, error handling, and file layout — code should read as if one team wrote it.

## No over-engineering

- Do not add abstractions, base classes, or config layers for a single use case.
- Do not add error handling for impossible or extremely unlikely paths.
- Comments explain **non-obvious business logic** only — good code is mostly self-explanatory.

## Tests

- Add tests when they protect real behavior (auth, contracts, regressions), not to assert the obvious.
- Run the relevant layer before opening a PR (see [AGENTS.md](../../AGENTS.md#tests-before-pr)).

## Documentation

- When behavior changes, update the **canonical** doc in the same PR (KB, ADR, `lib/api.ts`, module `CLAUDE.md`).
- Do not duplicate long explanations across files — **link** to the source of truth.

## Security and data

- Never trust client-supplied tenant IDs — scope by authenticated `tenant_id`.
- Never commit secrets (`.env`, API keys, `infra/.env`).
- Production deployments: `ENV=production`, `NEXT_PUBLIC_DEV_MODE=false`.

## Pull requests

- One logical change per PR when possible; clear description with how to test.
- Link issues with `Fixes #N` or `Related to #N` when applicable.
- **Maintainers** (repo write access): see [docs/ai/MAINTAINER.md](docs/ai/MAINTAINER.md) for assignee/reviewer labels.
