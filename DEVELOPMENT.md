# Development guide

Single entry for **self-hosting locally** and **contributing** to the OSS repo.

Managed-cloud marketing, `/enterprise`, and the operator admin console live in the private **zizkadb-cloud** repo — see [docs/REPO_SPLIT.md](docs/REPO_SPLIT.md).

---

## Self-host path (run ZizkaDB locally)

### Quickstart (no clone)

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

### Full dev stack (from a clone)

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB
bash scripts/setup-local.sh
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Swagger | http://localhost:8000/swagger |
| Dashboard | http://localhost:3001 |
| Postgres | localhost:5432 |

Dev login: http://localhost:3001/login → **Open my dashboard** (no email when `ENV=development`).

Dev API key: `zizkadb_dev_local` (accepted when `ENV=development`).

Verify the stack:

```bash
bash scripts/smoke-test.sh
```

### Dashboard UI only (port 3000)

```bash
cd dashboard
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev   # http://localhost:3000
```

Docker Compose serves the dashboard on **3001**; `npm run dev` uses **3000**.

---

## Contributor path (change code and open a PR)

1. Read [CONTRIBUTING.md](CONTRIBUTING.md) and [AGENTS.md](AGENTS.md).
2. Branch from `main`: `git checkout -b fix/short-description`.
3. Run the gates for the area you touched (see [Baseline](#baseline) below).
4. Open a PR using the template in [.github/pull_request_template.md](.github/pull_request_template.md).

**Module guides:** [core/CLAUDE.md](core/CLAUDE.md) · [dashboard/CLAUDE.md](dashboard/CLAUDE.md) · [dashboard/DASHBOARD_KNOWLEDGE_BASE.md](dashboard/DASHBOARD_KNOWLEDGE_BASE.md)

**Troubleshooting:** [wiki/Troubleshooting.md](wiki/Troubleshooting.md)

---

## Baseline

Recorded on **2026-09-04** (local macOS). Re-run before release or large refactors.

| Gate | Command | Result |
|------|---------|--------|
| Python lint | `ruff check core/ sdk/python/ mcp/ integrations/` | Pass |
| Doc drift | `bash scripts/check-doc-drift.sh` | Pass (13 routers) |
| Core unit tests | `pytest core/tests/ -m "not integration" -v` | Run locally (requires venv + deps) |
| Python SDK | `pytest sdk/python/tests/ -v` | Run locally |
| MCP | `pytest mcp/tests/ -v` | Run locally |
| TypeScript SDK | `cd sdk/typescript && npm test` | Run locally |
| Dashboard lint | `cd dashboard && npm run lint` | Pass |
| Dashboard tests | `cd dashboard && npm test` | Pass (170 tests, 27 files) |
| Dashboard build | `cd dashboard && npm run build` | Pass (29 routes) |

Full matrix (copy-paste):

```bash
ruff check core/ sdk/python/ mcp/ integrations/
bash scripts/check-doc-drift.sh
pytest core/tests/ -m "not integration" -v
pytest sdk/python/tests/ -v
pytest mcp/tests/ -v
cd sdk/typescript && npm ci && npm test
cd dashboard && npm ci && npm run lint && npm test && npm run build
```

CI runs the Python jobs, TypeScript SDK tests, and dashboard lint + **vitest** + build on every PR to `main`.
