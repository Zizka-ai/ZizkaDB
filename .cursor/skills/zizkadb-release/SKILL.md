---
name: zizkadb-release
description: Bumps versions, runs pre-push verification, and publishes ZizkaDB SDK and MCP packages. Use when releasing, publishing to PyPI or npm, bumping version, or running verify-release.
---

# ZizkaDB Release

## Version locations
| Package | File |
|---------|------|
| Python SDK | `sdk/python/pyproject.toml` |
| TypeScript SDK | `sdk/typescript/package.json` |
| MCP | `mcp/pyproject.toml` |
| API (display) | `core/main.py` `API_VERSION` |

Keep SDK versions aligned when possible.

## Pre-release workflow

```
- [ ] Bump version numbers
- [ ] Run verify-release.sh
- [ ] Run integration tests with stack up
- [ ] Run smoke-test.sh (full stack; `SKIP_EXAMPLE=1` for curl-only)
- [ ] Update CHANGELOG if maintained
- [ ] Publish packages
```

## Verify (required before publish)
```bash
bash scripts/verify-release.sh
```

Checks: Python syntax, editable installs, SDK unit, `zizkadb init` all templates, integration imports, dashboard build, optional API smoke + demo-why.

## Integration tests
```bash
bash scripts/setup-local.sh
pytest core/tests/ -m integration -v
bash scripts/smoke-test.sh
# curl-only against staging: SKIP_EXAMPLE=1 bash scripts/smoke-test.sh https://your-api.example
```

## Publish
```bash
bash scripts/publish-packages.sh
```
Read the script first — confirm PyPI/npm credentials and target packages.

## License reminder
- Core API, dashboard, Python/TS SDKs: **AGPL-3.0**
- MCP server: **MIT**

## Post-release
- Tag git release matching version
- Verify PyPI/npm package installable
- Smoke managed cloud if applicable (manual)
