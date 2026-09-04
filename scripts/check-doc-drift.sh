#!/usr/bin/env bash
# Verify AI-facing docs stay aligned with core/main.py (router count, OSS scope).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MAIN_PY="core/main.py"
CORE_README="core/README.md"
ADR_INDEX="docs/adr/README.md"

fail() {
  echo "check-doc-drift: $*" >&2
  exit 1
}

[[ -f "$MAIN_PY" ]] || fail "missing $MAIN_PY"
[[ -f "$CORE_README" ]] || fail "missing $CORE_README"
[[ -f "AGENTS.md" ]] || fail "missing AGENTS.md"
[[ -f "docs/ai/CODING_PRINCIPLES.md" ]] || fail "missing docs/ai/CODING_PRINCIPLES.md"
[[ -f "docs/ai/README.md" ]] || fail "missing docs/ai/README.md"
[[ -f "docs/adr/008-ai-coding-assistant-architecture.md" ]] || fail "missing ADR-008"

ROUTER_COUNT="$(grep -c 'app\.include_router' "$MAIN_PY" || true)"
[[ "$ROUTER_COUNT" -ge 1 ]] || fail "no app.include_router calls in $MAIN_PY"

if ! grep -q "${ROUTER_COUNT} total" "$CORE_README"; then
  fail "$CORE_README must say '${ROUTER_COUNT} total' routers (found $(grep -o '[0-9]\+ total' "$CORE_README" || echo 'none'))"
fi

if grep -q 'api/admin\.py' "$CORE_README"; then
  fail "$CORE_README must not list api/admin.py (OSS has no admin router)"
fi

if grep -q 'api/stats\.py' "$CORE_README"; then
  fail "$CORE_README must not list api/stats.py (no stats router)"
fi

if ! grep -q '008-ai-coding-assistant-architecture' "$ADR_INDEX"; then
  fail "$ADR_INDEX must index ADR-008"
fi

if grep -q 'GET /v1/admin/demo-requests' .cursor/rules/backend-dashboard-contract.mdc 2>/dev/null; then
  fail "backend-dashboard-contract.mdc must not reference OSS admin demo list endpoint"
fi

if grep -qE '897.line|897-line' CLAUDE.md dashboard/CLAUDE.md llms.txt 2>/dev/null; then
  fail "stale KB line count (897) in CLAUDE.md, dashboard/CLAUDE.md, or llms.txt"
fi

if grep -q '002–007' core/CLAUDE.md 2>/dev/null || grep -q '002-007' .cursor/rules/core-backend.mdc 2>/dev/null; then
  fail "stale migration range 002-007 — list actual files in core/db/migrations/"
fi

echo "check-doc-drift: OK (${ROUTER_COUNT} routers, AI docs present)"
