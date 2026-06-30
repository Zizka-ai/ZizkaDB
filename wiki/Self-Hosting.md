# Self-Hosting

Run ZizkaDB on your laptop or VPS with Docker.

## Quick local setup

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB
bash scripts/setup-local.sh
```

Or:

```bash
cp .env.example infra/.env
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dashboard.yml up -d
```

## Services

| Service   | Default URL                   |
| --------- | ----------------------------- |
| API       | http://localhost:8000         |
| Swagger   | http://localhost:8000/swagger |
| Dashboard | http://localhost:3001         |
| Postgres  | internal                      |
| Redis     | internal                      |
| Qdrant    | internal                      |

## Dashboard login (local)

1. Open http://localhost:3001/login
2. Click **Open my dashboard →** (dev mode, no email)
3. Create agents and keys like production

## SDK connection

```python
db = ZizkaDB(host="http://localhost:8000")
```

MCP:

```json
"env": { "ZIZKADB_HOST": "http://localhost:8000" }
```

## Production self-host

```bash
bash infra/deploy-production.sh   # backup first — never uses docker compose down -v
bash infra/deploy-selfhost.sh
```

**Never** `docker compose down -v` on a server with real users.

Local laptop reset only:

```bash
bash scripts/reset-local-db.sh
```

Configure in `infra/.env`:

- `DATABASE_URL`
- `REDIS_URL`
- `QDRANT_URL`
- `JWT_SECRET` / `JWT_REFRESH_SECRET`
- `EMAIL_*` for OTP login
- `ENV=production` (disables dev key bypass)
- **Do not set** `DEV_API_KEY` in production

## Embeddings

Dashboard → Settings → choose embedding model (OpenAI platform key or bring your own).

Semantic search requires embeddings configured.
