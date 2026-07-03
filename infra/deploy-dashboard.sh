#!/usr/bin/env bash
# Build and run the Next.js dashboard with PM2 on port 3001 (production default).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://db.zizka.ai}"
export NEXT_PUBLIC_DEV_MODE="${NEXT_PUBLIC_DEV_MODE:-false}"

# Docker dashboard fights for ports — do not run it in production
docker rm -f zizkadb_dashboard 2>/dev/null || true

cd "$ROOT/dashboard"
npm ci

# Stale .next causes blank site (HTML references missing webpack chunks → 400)
rm -rf .next
npm run build

WEBPACK=$(ls .next/static/chunks/webpack-*.js 2>/dev/null | head -1 || true)
if [ -z "$WEBPACK" ]; then
  echo "ERROR: build did not produce webpack chunk in .next/static/chunks/" >&2
  exit 1
fi

if [ ! -f ecosystem.config.js ]; then
  echo "ERROR: dashboard/ecosystem.config.js missing. Pull latest code or create it before deploy." >&2
  exit 1
fi

# Restart (not reload) after clean build so Node serves new static manifest
if pm2 describe zizkadb-dashboard >/dev/null 2>&1; then
  pm2 delete zizkadb-dashboard 2>/dev/null || true
fi
pm2 start ecosystem.config.js
pm2 save 2>/dev/null || true

sleep 3
pm2 list
curl -sf -o /dev/null http://127.0.0.1:3001/ && echo "Dashboard OK on :3001" || echo "Dashboard not responding on :3001"

CHUNK_NAME=$(basename "$WEBPACK")
CHUNK_CODE=$(curl -sS -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/_next/static/chunks/${CHUNK_NAME}" || echo "000")
if [ "$CHUNK_CODE" != "200" ]; then
  echo "ERROR: webpack chunk returned HTTP ${CHUNK_CODE} (expected 200 for ${CHUNK_NAME})" >&2
  exit 1
fi
echo "Static chunk OK: ${CHUNK_NAME}"
