#!/usr/bin/env bash
# Golden path E2E — requires API at localhost:8000 (docker compose up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export ZIZKADB_HOST="${ZIZKADB_HOST:-http://localhost:8000}"
export ZIZKADB_TELEMETRY=false

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker is not running." >&2
  echo "  Start Docker Desktop (or OrbStack), wait until the engine is ready, then:" >&2
  echo "    cd ~/Desktop/ZizkaDB" >&2
  echo "    docker compose -f infra/docker-compose.yml up -d postgres redis qdrant api" >&2
  echo "    bash scripts/run-golden-path.sh" >&2
  exit 1
fi

if ! curl -sf "$ZIZKADB_HOST/health" >/dev/null 2>&1; then
  echo "→ API not up yet — start the stack:" >&2
  echo "    docker compose -f infra/docker-compose.yml up -d postgres redis qdrant api" >&2
  echo "→ Waiting for API at $ZIZKADB_HOST ..."
  for i in $(seq 1 30); do
    if curl -sf "$ZIZKADB_HOST/health" >/dev/null; then
      break
    fi
    sleep 2
  done
fi

curl -sf "$ZIZKADB_HOST/health" >/dev/null || {
  echo "ERROR: API not reachable at $ZIZKADB_HOST after 60s." >&2
  echo "  Check: docker compose -f infra/docker-compose.yml ps" >&2
  echo "  Logs:  docker compose -f infra/docker-compose.yml logs api --tail 50" >&2
  exit 1
}

echo "→ Waiting for postgres, redis, and qdrant (/health/deep)..."
for i in $(seq 1 60); do
  if curl -sf "$ZIZKADB_HOST/health/deep" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('status') == 'ok' else 1)"; then
    break
  fi
  sleep 3
done
curl -sf "$ZIZKADB_HOST/health/deep" | python3 -c "import sys, json; d=json.load(sys.stdin); sys.exit(0 if d.get('status') == 'ok' else 1)" || {
  echo "ERROR: stack not healthy — /health/deep did not report ok." >&2
  curl -sf "$ZIZKADB_HOST/health/deep" || true
  exit 1
}

echo "→ Installing SDK + langgraph + MCP (doctor checks all three)..."
pip install -q -e "$ROOT/sdk/python" -e "$ROOT/integrations/langgraph" -e "$ROOT/mcp"

echo "→ Running golden path..."
python "$ROOT/examples/golden-path/langgraph-rag-bot/run.py"

echo "→ zizkadb doctor..."
zizkadb doctor --host "$ZIZKADB_HOST"

echo "✓ Golden path OK"
