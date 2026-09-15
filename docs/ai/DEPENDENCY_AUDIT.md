# Dependency audit — 2026-09-15

Day 11 security hygiene snapshot. Re-run before releases:

```bash
.venv/bin/python -m pip_audit -l                    # Python env (dev venv)
cd dashboard && npm audit --audit-level=critical   # Dashboard
cd sdk/typescript && npm audit --audit-level=critical
```

## Python (`pip-audit -l`)

**Result:** No known vulnerabilities in the local dev virtualenv (2026-09-15).

`core/requirements.txt` uses unpinned minimum versions; for production images use the pinned lock in Docker/CI rather than auditing the loose requirements file directly.

## Dashboard (`npm audit`)

| Severity | Count | Action |
|----------|-------|--------|
| Critical | 2 | **Deferred** — both are in `next@14.2.35`; fixes require `next@16.x` (breaking major upgrade) |
| High | 9 | Documented; non-critical dev/build transitive deps |
| Moderate | 4 | Documented |

Critical advisories (GHSA) affect self-hosted Next.js Image Optimizer, RSC deserialization, and related App Router paths. Mitigation until upgrade: keep `ENV=production`, do not expose the dev server publicly, and plan a Next.js major bump on its own schedule.

`npm audit fix` (non-force) reduced some transitive issues; critical Next.js items remain.

## TypeScript SDK (`npm audit`)

**Result:** No critical vulnerabilities (2026-09-15). Moderate issues in vitest/vite devDependencies only.

## Follow-up (not Day 11)

- Scheduled Next.js 14 → 16 upgrade with full dashboard regression (`npm run lint && npm test && npm run build`)
- Pin/hash Python deps for reproducible `pip-audit -r` scans
