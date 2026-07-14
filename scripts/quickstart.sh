#!/usr/bin/env bash
# OSS quickstart — one command: Docker stack + causal lineage demo + dashboard link.
# Requires Docker only (pre-built GHCR images when available; otherwise builds locally).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "════════════════════════════════════════════════════════"
echo "  ZizkaDB OSS quickstart"
echo "════════════════════════════════════════════════════════"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is required. Install from https://docs.docker.com/get-docker/" >&2
  exit 1
fi

# ── Start stack (pre-built images when available) ─────────────────────────────
bash scripts/setup-local.sh --no-banner

# ── Python SDK + demo ─────────────────────────────────────────────────────────
if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is required for the lineage demo." >&2
  exit 1
fi

echo "→ Installing zizkadb-sdk (if needed)..."
python3 -m pip install -q -e sdk/python 2>/dev/null || python3 -m pip install -q zizkadb-sdk

echo ""
echo "→ Running causal lineage demo (support-bot / order delay)..."
echo ""
python3 scripts/demo-why.py

echo ""
echo "════════════════════════════════════════════════════════"
echo "  Next steps"
echo "════════════════════════════════════════════════════════"
echo ""
echo "  Dashboard:  http://localhost:3001/login"
echo "              Click \"Open my dashboard →\" (no signup)"
echo ""
echo "  Connect:    see CONNECT.md in this repo"
echo "  Scaffold:   zizkadb init my-agent --template basic"
echo ""
echo "  Stop stack: docker compose -f infra/docker-compose.yml \\"
echo "                -f infra/docker-compose.dashboard.yml down"
echo ""
