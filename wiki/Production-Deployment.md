# Production Deployment (db.zizka.ai)

How the managed cloud instance is deployed on EC2 **without losing user data**.

## Golden rule

**Never run `docker compose down -v` on production.**

The `-v` flag deletes the Postgres volume — all signups, tenants, API keys, and events are gone permanently unless you restore from backup.

| Task | Command |
|------|---------|
| **Production deploy** | `bash infra/deploy-production.sh` |
| **Backup only** | `bash infra/backup-postgres.sh` |
| **Local fresh install** | `bash scripts/reset-local-db.sh` (laptop only) |

## Safe production deploy (EC2)

```bash
cd ~/agentdb   # or your clone path
bash infra/deploy-production.sh
```

This script:

1. Backs up Postgres to `infra/backups/zizkadb_<timestamp>.sql.gz`
2. Runs `git pull`
3. Rebuilds API with `docker compose up -d --build` — **no volume wipe**
4. Restarts API and deploys dashboard
5. Prints user count before/after and **fails** if count drops to zero

Non-interactive:

```bash
ZIZKA_DEPLOY_CONFIRM=yes bash infra/deploy-production.sh
```

## Daily backups (cron on EC2)

```bash
crontab -e
```

Add:

```cron
0 3 * * * cd /home/ubuntu/agentdb && bash infra/backup-postgres.sh >> /var/log/zizkadb-backup.log 2>&1
```

Backups are kept for 14 days (`BACKUP_KEEP_DAYS` to override).

## Restore from backup

```bash
cd ~/agentdb
# Pick latest backup
ls -lt infra/backups/

gunzip -c infra/backups/zizkadb_YYYYMMDDTHHMMSSZ.sql.gz | \
  docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U zizkadb -d zizkadb
```

For a full restore into an empty database, stop API first, restore, then restart.

## Pull latest (manual — prefer deploy-production.sh)

```bash
cd ~/agentdb
bash infra/backup-postgres.sh
git pull origin main
docker compose -f infra/docker-compose.yml up -d --build
docker compose -f infra/docker-compose.yml restart api
bash infra/deploy-dashboard.sh
```

## API (Python / FastAPI)

Schema changes apply on API startup via `core/db/connection.py` (idempotent `ALTER` / `CREATE IF NOT EXISTS`). **Do not** rely on re-running `schema.sql` — that only runs on a brand-new empty Postgres volume.

Verify:

```bash
curl -s https://db.zizka.ai/health
# {"status":"ok","version":"0.1.0"}
```

## Dashboard (Next.js)

```bash
cd ~/agentdb
bash infra/deploy-dashboard.sh
```

Dashboard runs on port **3001** behind nginx at `db.zizka.ai`.

## Common deploy mistakes

| Mistake | What happens | Fix |
|---------|--------------|-----|
| `docker compose down -v` on EC2 | **All users deleted** | Restore backup; use `deploy-production.sh` |
| `npm run build` from repo root | Build fails | `cd dashboard` first |
| API not restarted after pull | New routes missing | `docker compose restart api` |
| Schema fix + volume wipe | Data loss | Use migrations + backup, not `-v` |

## Environment (production)

- `ENV=production` in `infra/.env`
- `DATABASE_URL` — Postgres
- `REDIS_URL`, `QDRANT_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `TRIAL_DAYS` — trial length (default 30)
- `API_KEY_LIMITS_ENFORCED` — enable Pro/Team API key caps (default false)
- `NEXT_PUBLIC_API_URL=https://db.zizka.ai` for dashboard build
- **Do not set** `DEV_API_KEY` in production

## Verify after deploy

1. `curl https://db.zizka.ai/health` → ok
2. Check user count in deploy script output (should not drop)
3. Login to dashboard
4. Create agent → Test agent → event appears
