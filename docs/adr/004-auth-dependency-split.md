# ADR-004: Auth Dependency Split — `get_tenant` vs `require_dashboard_session`

**Status**: Accepted  
**Date**: 2024 (hardened in security audit, July 2026)

---

## Context

ZizkaDB has two fundamentally different types of callers:

1. **AI agent SDKs** — long-running processes that log events, run searches, and query memory. They authenticate with API keys. They should not be able to perform account management operations.

2. **Dashboard users** — humans interacting via the web UI. They authenticate with JWTs (from OTP email login). They manage API keys, view billing, change settings, and delete agents.

We need one API that serves both, with different levels of access per route.

---

## Decision

Two FastAPI dependency functions in `core/api/deps.py`:

### `get_tenant` — accepts both API keys and JWTs
```python
async def get_tenant(credentials: HTTPAuthorizationCredentials = Security(bearer)) -> dict:
    # accepts: API key, JWT, or dev key
    # returns: {tenant_id, user_id?}
```

Use for: event logging, search, memory, stats, agent data queries, telemetry.

### `require_dashboard_session` — JWT only, rejects API keys
```python
require_dashboard_session = dashboard_session_dependency(
    "Sign in to the dashboard to manage API keys"
)
```

Use for: billing status, API key management (list, create, revoke), agent deletion, account settings, GDPR operations.

### `assert_agent_allowed(tenant, agent_id)` — scope enforcement
```python
def assert_agent_allowed(tenant: dict, agent_id: str) -> None:
    scoped = tenant.get("agent_id")
    if scoped and scoped != agent_id:
        raise HTTPException(403, ...)
```

Call at the top of any per-agent analytics route (stats, sessions, baseline, behavior-change, time-travel). Agent-scoped API keys can only access data for their bound agent.

---

## Consequences

**Better:**
- An API key holder cannot enumerate or revoke other API keys — even with a valid tenant-wide key
- An API key holder cannot access billing routes, user data, or delete agents
- Scoped API keys provide per-agent data isolation for multi-agent deployments
- Dashboard JWTs work on all routes (both SDK-facing and dashboard-facing)

**Worse:**
- Developers must choose the correct dependency for every new route — wrong choice is a security regression
- The decision tree must be documented (see `core/CLAUDE.md`) and kept in sync

**Decision tree:**
```
SDK-callable?          → get_tenant
Dashboard-only?        → require_dashboard_session
Per-agent analytics?   → get_tenant + assert_agent_allowed
Admin panel?           → require_admin
```

---

## Alternatives considered

**Single universal auth dependency**: simpler, but API keys would have the same power as dashboard sessions — a scoped agent key could revoke its own key or read billing data.

**Scope everything via API key permissions**: more granular, but much more complex to implement and maintain; overkill for the current user population.
