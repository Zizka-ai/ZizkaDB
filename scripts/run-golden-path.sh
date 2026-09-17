#!/usr/bin/env bash
# Golden path E2E — requires API at localhost:8000 (docker compose up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ZIZKADB_HOST="${ZIZKADB_HOST:-http://localhost:8000}"
export ZIZKADB_TELEMETRY=false

echo "→ Waiting for API..."
for i in $(seq 1 30); do
  if curl -sf "$ZIZKADB_HOST/health" >/dev/null; then
    break
  fi
  sleep 2
done

curl -sf "$ZIZKADB_HOST/health" >/dev/null || {
  echo "API not reachable at $ZIZKADB_HOST" >&2
  exit 1
}

echo "→ Installing SDK + langgraph integration..."
pip install -q -e "$ROOT/sdk/python" -e "$ROOT/integrations/langgraph"

echo "→ Running golden path..."
python "$ROOT/examples/golden-path/langgraph-rag-bot/run.py"

echo "→ zizkadb doctor..."
pip install -q -e "$ROOT/sdk/python"
zizkadb doctor --host "$ZIZKADB_HOST"

echo "✓ Golden path OK"
