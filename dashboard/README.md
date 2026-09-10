# ZizkaDB Dashboard

Next.js 14 App Router — marketing site and authenticated tenant dashboard.

## Read first

| Doc | Purpose |
|-----|---------|
| [`CLAUDE.md`](CLAUDE.md) | Conventions, auth split, `apiFetch`, component patterns |
| [`DASHBOARD_KNOWLEDGE_BASE.md`](DASHBOARD_KNOWLEDGE_BASE.md) | Source of truth — screens, API contract, business rules |

Repo-wide setup: [DEVELOPMENT.md](../DEVELOPMENT.md).

## Local development

**Full stack (recommended):** `bash scripts/setup-local.sh` from the repo root — dashboard at **http://localhost:3001**.

**UI-only** (API already running on :8000):

```bash
cd dashboard
npm install
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev   # http://localhost:3000
```

Docker Compose serves the dashboard on **3001**; `npm run dev` uses **3000**. Do not mix them up when testing login or cookies.

## Verify before a PR

```bash
npm run lint
npm test
npm run build
```

CI runs all three on every PR to `main`.
