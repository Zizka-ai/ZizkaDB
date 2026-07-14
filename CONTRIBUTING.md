# Contributing to ZizkaDB

Thank you for your interest in ZizkaDB. We welcome bug reports, documentation improvements, SDK and integration work, dashboard UX, and core API changes — whether you are fixing a typo or designing a new primitive.

This guide explains how to get started, what we expect in pull requests, and the extra care required when changing a **multi-tenant operational database** (schema, auth, event storage, and drift baselines).

**Quick links**

| Resource | URL |
|----------|-----|
| Repository | https://github.com/Zizka-ai/ZizkaDB |
| OSS quickstart (no clone) | `curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh \| bash` |
| Connect guide | [CONNECT.md](CONNECT.md) |
| Docs | https://db.zizka.ai/docs |
| Architecture / trust | https://db.zizka.ai/trust |
| Wiki | https://github.com/Zizka-ai/ZizkaDB/wiki |
| Community board | https://db.zizka.ai/community |
| Issues | https://github.com/Zizka-ai/ZizkaDB/issues |
| Security | [SECURITY.md](SECURITY.md) |

Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

---

## Ways to contribute

You do **not** need a large PR to help.

| Type | Examples |
|------|----------|
| **Report bugs** | Events not appearing, drift score wrong, MCP tool failing — open a [GitHub issue](https://github.com/Zizka-ai/ZizkaDB/issues) with repro steps |
| **Improve docs** | README, wiki, `dashboard/app/docs`, integration guides |
| **Fix issues** | Pick an open issue or ask on the [community board](https://db.zizka.ai/community) |
| **SDKs & MCP** | Python / TypeScript SDK, `zizkadb-mcp` tools |
| **Integrations** | LangChain, CrewAI, OpenAI Agents, new framework adapters |
| **Dashboard** | Agent views, drift UI, admin tools |
| **Core API** | Event pipeline, search, baselines, auth |
| **Examples** | Minimal demos under `examples/` |
| **Discuss design** | Open an issue or community post before large architectural changes |

If you are unsure where to start, say hello on the [community board](https://db.zizka.ai/community) or open a **“Looking for guidance”** issue.

---

## License and legal

ZizkaDB is open source with a split license:

| Component | License |
|-----------|---------|
| API, dashboard, Python SDK, TypeScript SDK | [AGPL-3.0](LICENSE) |
| MCP server (`mcp/`) | [MIT](mcp/LICENSE) |

By contributing code, you agree that your contributions are licensed under the same license as the files you modify. If you contribute to AGPL-covered code, downstream users who run a modified network-facing version must comply with AGPL obligations (source availability, etc.).

For significant contributions, we may ask you to confirm you have the right to submit the work (employer IP, etc.).

---

## Development setup

### Prerequisites

- **Docker** + Docker Compose v2
- **Python 3.10+** (API tests, SDK, demos)
- **Node.js 18+** (optional — only if you work on `dashboard/`)
- **Git**

### One-command local stack

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git
cd ZizkaDB
bash scripts/setup-local.sh
```

| Service | URL |
|---------|-----|
| API health | http://localhost:8000/health |
| Swagger | http://localhost:8000/swagger |
| Dashboard | http://localhost:3001/login → **Open my dashboard →** |

Local dev uses `DEV_API_KEY=zizkadb_dev_local` (see `infra/.env`). The Python SDK auto-injects this key against `localhost:8000`.

### Verify your environment

```bash
bash scripts/smoke-test.sh
python scripts/demo-why.py
```

### API unit & integration tests

```bash
cd core
pip install -r requirements.txt -r requirements-dev.txt
pip install -e ../sdk/python   # SDK tests import zizkadb

# Unit tests only (no Docker)
pytest -m "not integration"

# Full suite (Docker stack must be running)
pytest
```

### Dashboard (optional)

Prefer the one-command stack (port **3001**):

```bash
bash scripts/setup-local.sh
# http://localhost:3001/login → Open my dashboard →
```

Or run the dashboard alone for UI work:

```bash
cd dashboard
npm install
npm run dev    # http://localhost:3000 — set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run build
npm run lint
```

### Reset local data (dev only)

```bash
bash scripts/reset-local-db.sh
```

**Never** run `docker compose down -v` on a server with real users — it wipes Postgres volumes.

---

## Repository layout

```
ZizkaDB/
├── core/              # FastAPI API, Postgres/Qdrant/Redis, auth, events, baselines
│   ├── api/           # HTTP routes
│   ├── db/            # schema.sql, connection pool, idempotent migrations
│   └── tests/
├── dashboard/         # Next.js app (db.zizka.ai UI)
├── sdk/python/        # PyPI: zizkadb-sdk
├── sdk/typescript/    # npm: zizkadb-sdk
├── mcp/               # PyPI: zizkadb-mcp (MIT)
├── integrations/      # LangChain, CrewAI, etc.
├── examples/          # Runnable sample agents
├── infra/             # Docker Compose, deploy scripts
├── scripts/           # setup-local.sh, smoke-test.sh, demos
└── wiki/              # GitHub wiki source (mirrored on GitHub)
```

When changing behavior, update **all surfaces** that expose it: API route, OpenAPI/Swagger, SDK methods, MCP tools (if applicable), docs, and dashboard UI.

---

## Making a change

### 1. Discuss first (for non-trivial work)

Open an issue or community post if your change:

- Adds a new API primitive or MCP tool
- Changes schema or event semantics
- Affects multi-tenant isolation or auth
- Removes or renames public SDK methods
- Changes default retention, billing, or AGPL-covered network behavior

Small fixes (typos, obvious bugs, test gaps) can go straight to a PR.

### 2. Fork and branch

```bash
git checkout -b feat/short-description    # features
git checkout -b fix/issue-123-description # bug fixes
git checkout -b docs/what-you-changed     # documentation only
```

### 3. Write focused commits

- One logical change per commit when possible
- Use clear messages: `fix(api): reject events without tenant scope`
- Reference issues: `Fixes #123` in the PR description

### 4. Open a pull request

Target the `main` branch on [Zizka-ai/ZizkaDB](https://github.com/Zizka-ai/ZizkaDB).

**PR description should include:**

1. **What** changed and **why**
2. **How to test** (commands, curl, screenshots for UI)
3. **Areas touched** (API / schema / SDK / dashboard / MCP)
4. **Breaking changes** (if any)
5. Link to related issue(s)

Keep PRs small and reviewable. Split large work into stacked PRs when you can.

---

## Area-specific guidelines

### Core API (`core/`)

- Python 3.10+, async (`asyncpg`, FastAPI)
- All tenant data must be scoped by `tenant_id` from the authenticated API key or JWT — **never** trust client-supplied tenant IDs
- Events are **append-only** by default; `forget` / GDPR paths are explicit APIs
- New endpoints: add tests in `core/tests/`, document in Swagger, mirror in SDK/MCP if user-facing
- Log meaningful errors server-side; return safe messages to clients (no stack traces in production)

### Database & schema (critical)

ZizkaDB stores production agent history. Schema mistakes can cause data loss or downtime.

**New installs:** update `core/db/schema.sql` so fresh `docker compose up` gets the full schema.

**Existing deployments:** add **idempotent** migrations in `core/db/connection.py` (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, guarded `DO $$` blocks). Migrations run on API startup.

Rules:

1. **Prefer additive changes** — new columns, new tables, new indexes
2. **Avoid destructive changes** (`DROP COLUMN`, mass `UPDATE` without filters) without maintainer approval and a documented upgrade path
3. **Test both paths:** empty DB (schema.sql) and upgraded DB (migrations in connection.py)
4. **Index consciously** — event tables grow fast; note expected query patterns in the PR
5. **Qdrant:** collection `agent_events` — coordinate embedding dimension changes with maintainers

### Python SDK (`sdk/python/`)

- Public surface: `ZizkaDB`, `log`, `why`, `at`, `search`, `baseline`, etc.
- Maintain backward compatibility for `zizkadb_live_*` and legacy `agdb_*` keys where documented
- Bump version in `sdk/python/pyproject.toml` only when maintainers cut a PyPI release
- Add or update tests under `core/tests/` that import `zizkadb`

### TypeScript SDK (`sdk/typescript/`)

- Keep parity with Python SDK for core methods where feasible
- Run `npm run build` in `sdk/typescript/` before PR

### MCP server (`mcp/`)

- MIT licensed — keep dependencies minimal
- New tools must map to real API endpoints and be documented in `mcp/README.md`
- Test with `uvx zizkadb-mcp` against local stack

### Dashboard (`dashboard/`)

- Next.js 14, mostly inline styles matching existing pages
- Use `NEXT_PUBLIC_API_URL` for API base; never embed secrets
- UI changes: include screenshot in PR when visual

### Integrations & examples

- Put reusable adapters in `integrations/`; runnable demos in `examples/`
- Each example needs a short README and `requirements.txt` (or `package.json`)
- Prefer `parent_id` / `session_id` in examples so `why()` and drift work out of the box

---

## Testing expectations

| Change type | Minimum bar |
|-------------|-------------|
| Bug fix | Test that reproduces the bug, or smoke test path |
| API / auth | `pytest` in `core/tests/` |
| Schema | Manual test: fresh install + migrate existing volume |
| SDK | Unit test or extend `core/tests/test_smoke.py` |
| Dashboard | `npm run build` passes; manual check described in PR |
| Docs only | Link check; no tests required |

```bash
bash scripts/smoke-test.sh
cd core && pytest -m "not integration"
cd core && pytest    # with Docker up
```

Mark slow or Docker-dependent tests with `@pytest.mark.integration`.

---

## Documentation

Update docs in the same PR as code when behavior changes:

- `README.md` — quick start, high-level behavior
- `dashboard/app/docs/sections.tsx` — user-facing docs on db.zizka.ai
- `wiki/` — deployment, MCP, troubleshooting
- Package READMEs: `sdk/python/README.md`, `mcp/README.md`, etc.

Use real commands and copy-pasteable snippets. Prefer `zizkadb_dev_local` / `zizkadb_live_*` naming (not legacy `agdb_*` in new docs).

---

## Security

Do **not** open public issues for vulnerabilities.

See [SECURITY.md](SECURITY.md) for responsible disclosure. Security fixes take priority over feature work.

Especially sensitive areas:

- API key hashing and validation
- JWT / OTP auth
- Cross-tenant data leaks
- SQL injection, SSRF in dashboard proxies
- Embedding API key storage (`embedding_api_key_encrypted`)

---

## Code style

We value consistency with surrounding code over strict formatting rules.

- **Python:** follow existing patterns in `core/`; type hints where already used
- **TypeScript:** match `dashboard/` conventions; run `npm run lint`
- **No unrelated refactors** in the same PR as a feature or fix
- **Comments:** only for non-obvious business logic (tenant rules, drift math, migration rationale)

---

## Maintainer workflow

Maintainers will:

1. Review for correctness, security, and tenant isolation
2. Run CI / smoke tests
3. Squash-merge or merge with clean history
4. Cut releases for PyPI (`zizkadb-sdk`, `zizkadb-mcp`) and npm (`zizkadb-sdk`) on their own schedule

You do not need permission to open a PR. You **do** need alignment for large design changes — talk to us first.

---

## Recognition

Contributors are credited in release notes and, with permission, on the project site. Thank you for helping build operational infrastructure for AI agents.

**Questions?** [Community board](https://db.zizka.ai/community) · [GitHub Discussions/Issues](https://github.com/Zizka-ai/ZizkaDB/issues) · founder@zizka.ai
