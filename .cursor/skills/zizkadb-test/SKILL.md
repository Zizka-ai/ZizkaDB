---
name: zizkadb-test
description: Run the full ZizkaDB test suite across all layers — lint, Python unit tests, SDK tests, MCP tests, TypeScript tests, and dashboard build verification. Use when running tests, verifying a change, or before opening a PR.
---

# ZizkaDB — Full Test Suite

Run all layers in this order. All must pass before a PR is merged.

## 1. Python linter

```bash
ruff check core/ sdk/python/ mcp/ integrations/
```

Expected: `All checks passed!` — fix any errors before continuing.

## 2. Core API unit tests

```bash
pytest core/tests/ -m "not integration" -v
```

These run without a database. Fast (<10s).

## 3. Python SDK tests

```bash
pytest sdk/python/tests/ -v
```

## 4. MCP server tests

```bash
pytest mcp/tests/ -v
```

## 5. TypeScript SDK tests

```bash
cd sdk/typescript && npm test
```

## 6. Dashboard (lint + build)

```bash
cd dashboard && npm run lint && npm run build
```

There are no dashboard unit tests — the build is the gate. Warnings are OK; errors are not.

---

## Integration tests (optional — needs running stack)

```bash
bash scripts/setup-local.sh   # start Postgres, Qdrant, Redis, API
ZIZKADB_RUN_INTEGRATION=1 pytest core/tests/test_integration_selfhost.py -v
```

---

## CI equivalent

The above matches what `.github/workflows/ci.yml` runs on every PR. If CI passes, all layers are green.
