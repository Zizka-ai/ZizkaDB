# ADR-003: Billing Is Intentionally Stubbed

**Status**: Accepted  
**Date**: 2024

---

## Context

ZizkaDB has a billing model (Pro, Team, Enterprise plans, 30-day trials) and a dashboard that shows plan status, trial countdowns, and upgrade prompts. A real billing integration (Stripe) was evaluated early in development.

---

## Decision

Billing is **fully stubbed**. `billing_status_payload()` in `core/services/billing.py` always returns:

```python
{
    "enforced": False,
    "has_access": True,
    "requires_plan_selection": False,
    "requires_checkout": False,
    "subscription_status": user["subscription_status"],
    "trial_ends_at": user["trial_ends_at"],
    "plan": effective_plan,
}
```

`has_access` is always `True`. No Stripe SDK, no payment provider, no webhook handler exists. The `users.stripe_customer_id` and `users.stripe_subscription_id` columns are retained in the schema but are never written to — legacy from an earlier prototype.

Plan limits (API key caps) are enforced separately via `core/services/entitlements.py` and a kill switch `API_KEY_LIMITS_ENFORCED` (defaults to OFF).

---

## Consequences

**Better:**
- Signup and onboarding flows work end-to-end without payment credentials
- Self-hosters get full access without needing to configure billing
- Faster to ship — billing integration is complex and error-prone
- The architecture is wired and ready: billing routes exist, plan fields exist on `users`, entitlement checks exist

**Worse:**
- No revenue collection from managed cloud users
- `trial_ends_at` is stored and shown in the dashboard but has no enforcement
- Dashboard shows trial countdown UI that currently has no consequence when it expires

**When adding real billing:**
1. Integrate Stripe in `core/services/billing.py` — replace `billing_status_payload()` stub
2. Add Stripe webhook handler (new router at `/v1/webhooks/stripe`)
3. Flip `enforced: True` in `billing_status_payload()` based on subscription status
4. Flip `API_KEY_LIMITS_ENFORCED=true` to enforce per-plan key caps
5. The `stripe_customer_id` / `stripe_subscription_id` columns are already in the schema — no DDL needed

---

## Alternatives considered

**Stripe from day 1**: adds weeks of development and testing; not necessary to validate the core product.

**Usage-based billing only**: considered but deferred — the plan structure already exists and is surfaced in the dashboard.
