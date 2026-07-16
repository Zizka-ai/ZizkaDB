#!/usr/bin/env bash
# Safe production deploy for db.zizka.ai — NEVER wipes Postgres volumes.
#
# Usage on EC2:
#   cd ~/agentdb && bash infra/deploy-production.sh
#
# Non-interactive (CI / scripted):
#   ZIZKA_DEPLOY_CONFIRM=yes bash infra/deploy-production.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f infra/docker-compose.yml)

# shellcheck disable=SC1091
source "$ROOT/infra/lib/production-guard.sh"
ZIZKA_ROOT="$ROOT"
_zizka_load_env

POSTGRES_USER="${POSTGRES_USER:-zizkadb}"
POSTGRES_DB="${POSTGRES_DB:-zizkadb}"

if ! zizka_is_production; then
  echo "WARNING: ENV is not 'production' in infra/.env." >&2
  echo "This script is for db.zizka.ai production. For local dev use:" >&2
  echo "  bash scripts/setup-local.sh" >&2
  read -r -p "Continue anyway? (y/N): " ok
  [ "$ok" = "y" ] || [ "$ok" = "Y" ] || exit 1
fi

if [ "${NEXT_PUBLIC_DEV_MODE:-}" = "true" ]; then
  echo "ERROR: NEXT_PUBLIC_DEV_MODE=true in infra/.env." >&2
  echo "This bypasses dashboard login entirely — must be 'false' for any public deployment." >&2
  exit 1
fi

zizka_require_deploy_confirm

echo "════════════════════════════════════════════════════════"
echo "  ZizkaDB production deploy (safe — no volume wipe)"
echo "════════════════════════════════════════════════════════"

echo "→ Step 1/5: Postgres backup"
bash "$ROOT/infra/backup-postgres.sh"

USERS_BEFORE=$("${COMPOSE[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "?")
echo "   Users before deploy: $USERS_BEFORE"

echo "→ Step 2/5: git pull"
git pull origin main

echo "→ Step 3/5: Rebuild & restart API stack (no -v)"
"${COMPOSE[@]}" up -d --build

echo "→ Step 4/5: Wait for API health"
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8000/health/deep >/dev/null 2>&1; then
    break
  fi
  sleep 2
  if [ "$i" -eq 30 ]; then
    echo "ERROR: API not healthy. Check: docker compose -f infra/docker-compose.yml logs api" >&2
    exit 1
  fi
done
curl -sf http://127.0.0.1:8000/health/deep && echo ""

echo "→ Step 5/5: Dashboard (PM2)"
bash "$ROOT/infra/deploy-dashboard.sh"

USERS_AFTER=$("${COMPOSE[@]}" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc "SELECT COUNT(*) FROM users;" 2>/dev/null | tr -d '[:space:]' || echo "?")

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Deploy complete"
echo "════════════════════════════════════════════════════════"
echo "  Users before: $USERS_BEFORE"
echo "  Users after:  $USERS_AFTER"
echo "  Health:       $(curl -sf http://127.0.0.1:8000/health/deep || echo FAIL)"
echo ""

if [ "$USERS_BEFORE" != "?" ] && [ "$USERS_AFTER" != "?" ] && [ "$USERS_BEFORE" -gt 0 ] 2>/dev/null && [ "$USERS_AFTER" = "0" ]; then
  echo "⚠️  CRITICAL: User count dropped to zero. Restore from infra/backups/ immediately." >&2
  exit 1
fi

if [ "$USERS_BEFORE" != "?" ] && [ "$USERS_AFTER" != "?" ] && [ "$USERS_BEFORE" -gt "$USERS_AFTER" ] 2>/dev/null; then
  echo "⚠️  WARNING: User count decreased ($USERS_BEFORE → $USERS_AFTER). Investigate before announcing deploy." >&2
fi
