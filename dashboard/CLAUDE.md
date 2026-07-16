# dashboard/ — Next.js Dashboard

See root [`CLAUDE.md`](../CLAUDE.md) for full project context.

**Before touching any dashboard code, read [`DASHBOARD_KNOWLEDGE_BASE.md`](DASHBOARD_KNOWLEDGE_BASE.md) first.** It is the 897-line source of truth with a full Table of Contents covering architecture, every screen's behaviour, the API contract, auth model, business rules, and the DB schema from the dashboard's perspective.

---

## Three facts too critical to miss

1. **No payment gate.** Signup flow: plan selection → GDPR consent → OTP verify → `/dashboard`. Users get a 30-day Pro trial on first login. No checkout, no Stripe, no payment wall.

2. **Auth split.** Middleware (`middleware.ts`) reads the `access-token` cookie for server-side route protection. Client JS reads `localStorage` for the JWT. The refresh token is an HttpOnly cookie. Keep cookie + localStorage in sync via `setToken()`/`clearToken()` in `lib/auth.ts`.

3. **All API calls go through `lib/api.ts::apiFetch`.** Never use raw `fetch` from components. `apiFetch` injects auth, normalises errors, and handles 401 redirects.

---

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
cd dashboard && npm run lint && npm run build
```

There are no frontend unit tests. The build is the gate.

---

## Keep KB in sync

If you change billing/auth/signup funnel, `lib/api.ts`, routes, a backend endpoint the dashboard calls, or the DB schema — **update `DASHBOARD_KNOWLEDGE_BASE.md`** in the same PR (§7 business rules, §8 API layer, §17.3 endpoint map, §18 state machine, §19–21 per-screen behaviour + data model).
