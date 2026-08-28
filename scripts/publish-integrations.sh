#!/usr/bin/env bash
# Build and publish zizkadb-langchain + zizkadb-crewai + zizkadb-livekit to PyPI.
#
# Prerequisites:
#   export TWINE_USERNAME=__token__
#   export TWINE_PASSWORD=pypi-...
#
# Usage:
#   bash scripts/publish-integrations.sh          # build + upload all
#   bash scripts/publish-integrations.sh --build-only
#   bash scripts/publish-integrations.sh --livekit-only   # first publish for livekit only
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUILD_ONLY=false
LIVEKIT_ONLY=false
[[ "${1:-}" == "--build-only" ]] && BUILD_ONLY=true
[[ "${1:-}" == "--livekit-only" ]] && LIVEKIT_ONLY=true

read_ver() {
  grep '^version' "$1" | head -1 | sed 's/.*"\(.*\)".*/\1/'
}

LANGCHAIN_VER="$(read_ver integrations/langchain/pyproject.toml)"
CREWAI_VER="$(read_ver integrations/crewai/pyproject.toml)"
LIVEKIT_VER="$(read_ver integrations/livekit/pyproject.toml)"

pip install -q build twine

build_langchain() {
  echo "→ Build zizkadb-langchain ${LANGCHAIN_VER}"
  (cd integrations/langchain && rm -rf dist build *.egg-info && python3 -m build)
  twine check "integrations/langchain/dist/zizkadb_langchain-${LANGCHAIN_VER}"*
}

build_crewai() {
  echo "→ Build zizkadb-crewai ${CREWAI_VER}"
  (cd integrations/crewai && rm -rf dist build *.egg-info && python3 -m build)
  twine check "integrations/crewai/dist/zizkadb_crewai-${CREWAI_VER}"*
}

build_livekit() {
  echo "→ Build zizkadb-livekit ${LIVEKIT_VER}"
  (cd integrations/livekit && rm -rf dist build *.egg-info && python3 -m build)
  twine check "integrations/livekit/dist/zizkadb_livekit-${LIVEKIT_VER}"*
}

upload_langchain() {
  echo "→ Upload zizkadb-langchain ${LANGCHAIN_VER}"
  twine upload --verbose "integrations/langchain/dist/zizkadb_langchain-${LANGCHAIN_VER}"*
}

upload_crewai() {
  echo "→ Upload zizkadb-crewai ${CREWAI_VER}"
  twine upload --verbose "integrations/crewai/dist/zizkadb_crewai-${CREWAI_VER}"*
}

upload_livekit() {
  echo "→ Upload zizkadb-livekit ${LIVEKIT_VER}"
  twine upload --verbose "integrations/livekit/dist/zizkadb_livekit-${LIVEKIT_VER}"*
}

if $LIVEKIT_ONLY; then
  build_livekit
  if $BUILD_ONLY; then
    echo ""
    echo "Build OK (livekit only). Upload when ready:"
    echo "  export TWINE_USERNAME=__token__"
    echo "  export TWINE_PASSWORD=pypi-..."
    echo "  bash scripts/publish-integrations.sh --livekit-only"
    exit 0
  fi
else
  build_langchain
  build_crewai
  build_livekit
fi

if $BUILD_ONLY; then
  echo ""
  echo "Build OK. Upload when ready:"
  echo "  export TWINE_USERNAME=__token__"
  echo "  export TWINE_PASSWORD=pypi-..."
  echo "  bash scripts/publish-integrations.sh              # all packages"
  echo "  bash scripts/publish-integrations.sh --livekit-only  # livekit only"
  exit 0
fi

if [[ "${TWINE_USERNAME:-}" != "__token__" ]]; then
  echo "Set PyPI credentials before upload:"
  echo '  export TWINE_USERNAME=__token__'
  echo '  export TWINE_PASSWORD=pypi-...'
  exit 1
fi

if [[ -z "${TWINE_PASSWORD:-}" ]]; then
  echo "TWINE_PASSWORD is empty."
  exit 1
fi

if $LIVEKIT_ONLY; then
  upload_livekit
else
  upload_langchain
  upload_crewai
  upload_livekit
fi

echo ""
echo "Verify:"
echo "  pip index versions zizkadb-livekit"
echo "  pip install zizkadb-livekit"
