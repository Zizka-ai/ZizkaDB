#!/usr/bin/env bash
# Build and run the ZizkaDB dashboard on your own server (self-host / VPS).
#
# Usage:
#   bash infra/deploy-selfhost.sh
#
# Environment (optional):
#   NEXT_PUBLIC_API_URL   — API base URL the browser calls (default: empty = same-origin /v1 via nginx)
#   NEXT_PUBLIC_DEV_MODE  — true = "Open my dashboard" button (solo dev); false = email OTP only
#   PUBLIC_HOST           — printed in success message (default: localhost)
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Self-host defaults: point at local API unless nginx proxies same-origin
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
export NEXT_PUBLIC_DEV_MODE="${NEXT_PUBLIC_DEV_MODE:-true}"
PUBLIC_HOST="${PUBLIC_HOST:-localhost}"

echo "→ ZizkaDB self-host dashboard deploy"
echo "   NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-<same-origin>}"
echo "   NEXT_PUBLIC_DEV_MODE=$NEXT_PUBLIC_DEV_MODE"
echo ""

docker rm -f zizkadb_dashboard 2>/dev/null || true

cd "$ROOT/dashboard"
npm ci
rm -rf .next
NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" NEXT_PUBLIC_DEV_MODE="$NEXT_PUBLIC_DEV_MODE" npm run build

WEBPACK=$(ls .next/static/chunks/webpack-*.js 2>/dev/null | head -1 || true)
if [ -z "$WEBPACK" ]; then
  echo "ERROR: build did not produce webpack chunk" >&2
  exit 1
fi

if [ ! -f ecosystem.config.js ]; then
  echo "ERROR: dashboard/ecosystem.config.js missing" >&2
  exit 1
fi

if pm2 describe zizkadb-dashboard >/dev/null 2>&1; then
  pm2 delete zizkadb-dashboard 2>/dev/null || true
fi
pm2 start ecosystem.config.js
pm2 save 2>/dev/null || true

sleep 3
curl -sf -o /dev/null http://127.0.0.1:3001/ && echo "✓ Dashboard OK on :3001" || echo "⚠ Dashboard not responding on :3001"

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Self-host dashboard deployed"
echo "════════════════════════════════════════════════════════"
echo ""
if [ "$NEXT_PUBLIC_DEV_MODE" = "true" ]; then
  echo "  Login:     http://${PUBLIC_HOST}:3001/login → Open my dashboard →"
  echo "  SDK:       ZizkaDB(host=\"http://localhost:8000\")  # same dev tenant"
else
  echo "  Login:     http://${PUBLIC_HOST}:3001/login  (email OTP — configure EMAIL_* in infra/.env)"
  echo "  SDK:       use API key from Dashboard → Settings"
fi
echo "  API:       ensure infra/docker-compose.yml is up on :8000"
echo "  Nginx:     see infra/nginx.conf for routing / → :3001, /v1/ → :8000"
echo ""
