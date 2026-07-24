# dashboard/ — Next.js Dashboard

See root [`CLAUDE.md`](../CLAUDE.md) for full project context.

**Before touching any dashboard code, read [`DASHBOARD_KNOWLEDGE_BASE.md`](DASHBOARD_KNOWLEDGE_BASE.md) first.** It is the 897-line source of truth with a full Table of Contents covering architecture, every screen's behaviour, the API contract, auth model, business rules, and the DB schema from the dashboard's perspective.

---

## Three facts too critical to miss

1. **No payment gate.** Signup flow: plan selection → GDPR consent → OTP verify → `/dashboard`. Users get a 30-day Pro trial on first login. No checkout, no Stripe, no payment wall.

2. **Auth split.** Middleware (`middleware.ts`) reads the `access-token` cookie for server-side route protection. Client JS reads `localStorage` for the JWT. The refresh token is an HttpOnly cookie. Keep cookie + localStorage in sync via `setToken()`/`clearToken()` in `lib/auth.ts`.

3. **All API calls go through `lib/api.ts::apiFetch`.** Never use raw `fetch` from components. `apiFetch` injects auth, normalises errors, and handles 401 redirects.

---

## Information architecture

The dashboard is **horizontal top-level tabs**, not a sidebar. Each tab is a route
under `app/dashboard/`, and the selected agent travels in the `?agent=` query param
so back/forward, refresh, bookmarking and sharing all work.

| Tab | Route | Editions |
|---|---|---|
| Activity (Events · Sessions · Time Travel) | `/dashboard/activity` | all |
| Agent Behavior | `/dashboard/behavior` | all |
| Reports | `/dashboard/reports` | all (empty state — no backend) |
| Suggestions | `/dashboard/suggestions` | all (empty state — no backend) |
| Agent Fleets | `/dashboard/fleet` | managed only; OSS redirects to Activity |
| Settings | `/dashboard/settings` | all — header icon, not a tab |

Legacy routes kept as redirects: `/dashboard` and `/dashboard/search` → Activity;
`/dashboard/agents/[id]` → `/dashboard/activity?agent={id}`.

Edition comes from `useEdition()`: `NEXT_PUBLIC_DEPLOYMENT_MODE` is authoritative,
with a plan lookup as fallback, **failing closed to OSS**. Set the build arg in
`infra/docker-compose.dashboard.yml` and `dashboard/Dockerfile`.

Data fetching lives in `hooks/`; `components/ui/` is presentational primitives and
`components/dashboard/` is dashboard-specific composition. Don't fetch in components.

`useAgents()` is backed by a small module-level pub/sub so the header selector and
the active tab share one poll and one list — not a state library, and not a licence
to add one.

## Conventions

- Next.js 14 App Router. Interactive pages: `'use client'`. Server components for static shells.
- TypeScript strict, `@/*` alias. No Prettier — 2-space indent, single quotes, no semicolons.
- No React Query / SWR / Redux / Zustand / Context — local `useState`/`useEffect` only.
- Guard every async effect with `let cancelled = false`; check before `setState`.
- Render a `*Fallback` loader while auth/redirect checks are pending.
- Wrap `useSearchParams` pages in `<Suspense>` (Next.js CSR bailout requirement).

---

## Test / verification

```bash
cd dashboard && npm run lint && npm run build && npm run test
```

All three must pass. `npm run test` is Vitest + React Testing Library, covering
the pure helpers in `lib/events.ts`, the data hooks, and the `Tabs`/`FleetTable`
components.

Vitest runs with `pool: 'forks'` and `singleFork: true` (see `vitest.config.ts`).
The default worker-thread pool times out its RPC on synced filesystems such as
iCloud Drive — don't switch it back without checking that.

---

## Keep KB in sync

If you change billing/auth/signup funnel, `lib/api.ts`, routes, a backend endpoint the dashboard calls, or the DB schema — **update `DASHBOARD_KNOWLEDGE_BASE.md`** in the same PR (§7 business rules, §8 API layer, §17.3 endpoint map, §18 state machine, §19–21 per-screen behaviour + data model).
