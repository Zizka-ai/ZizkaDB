# Staging (Phase 1)

Prod-like stack for rehearsing deploys. **Isolated data** — never share the production database.

Managed cloud operators apply this on the EC2 that also runs `db.zizka.ai` (private `zizkadb-cloud` deploy path). Templates live in this public repo under `infra/`.

## Shape

| | Production | Staging |
|---|---|---|
| Hostname | `db.zizka.ai` | `staging-db.zizka.ai` |
| Compose project | default / prod name | `zizkadb-staging` |
| API host port | `8000` | `8001` |
| Dashboard (PM2) | `3001` | `3002` |
| Postgres / Redis / Qdrant ports | `5432` / `6379` / `6333` | `5433` / `6380` / `6335` |
| Env file | prod secrets | `infra/.env.staging` (different JWTs) |
| Flags | `ENV=production`, no `DEV_API_KEY`, `NEXT_PUBLIC_DEV_MODE=false` | **same** |

## Bring up (API data plane)

```bash
cp infra/.env.staging.example infra/.env.staging
# fill JWT secrets, DB password, email, OPENAI if needed

export COMPOSE_PROJECT_NAME=zizkadb-staging
docker compose \
  -f infra/docker-compose.yml \
  -f infra/docker-compose.staging.yml \
  --env-file infra/.env.staging \
  up -d --build
```

Health:

```bash
curl -sf http://127.0.0.1:8001/health/deep
```

## DNS / TLS / nginx

1. Point `staging-db.zizka.ai` at the same EC2 as prod.
2. Issue a TLS cert for that hostname.
3. Add a server block — see [`infra/nginx.staging.snippet.conf`](../infra/nginx.staging.snippet.conf).
4. Run staging dashboard on port `3002` with `NEXT_PUBLIC_DEV_MODE=false` and `NEXT_PUBLIC_API_URL=https://staging-db.zizka.ai`.

## Deploy order

1. Deploy candidate SHA to **staging**
2. `curl -sf https://staging-db.zizka.ai/health/deep`
3. OTP login (no “Open my dashboard” bypass)
4. `ZIZKADB_API_KEY=... bash scripts/smoke-test.sh https://staging-db.zizka.ai`
5. Only then deploy **prod**

Never `docker compose down -v` on the production project.

## Smoke

```bash
# Staging / production-like (requires a real API key from staging dashboard)
ZIZKADB_API_KEY='zizkadb_live_...' bash scripts/smoke-test.sh https://staging-db.zizka.ai

# Local development (dev key / dev-token still supported)
bash scripts/smoke-test.sh http://localhost:8000
```
