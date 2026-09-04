"""Single source of truth for per-plan entitlements (limits + future feature access).

Only the plans listed in ``PLAN_ENTITLEMENTS`` are capped. Anything else
(unknown, ``pending_checkout``, ``None``) is treated as unlimited.

To change a plan's limit:
  - Quick/no-deploy: set ``API_KEY_LIMIT_<PLAN>`` (e.g. ``API_KEY_LIMIT_PRO=5``)
    and restart. Overrides the default below for that one plan.
  - Permanent: edit the value in ``PLAN_ENTITLEMENTS`` below. This is the only
    file that needs to change — no other business logic references the
    numbers directly.

Adding a new capped resource (e.g. max agents) is a one-field change to
``PlanEntitlements`` plus a value per plan below — no other business logic
needs to change. Adding a new plan is a one-line dict entry.
"""

from __future__ import annotations

import os
from dataclasses import dataclass

# ``None`` means "no cap".
UNLIMITED: int | None = None


@dataclass(frozen=True)
class PlanEntitlements:
    max_api_keys: int | None = UNLIMITED
    # Future limits (max_agents, max_team_members, max_events_per_month,
    # max_storage_mb, data_retention_days, features: frozenset[str]) go here.


# The only plans with entitlement caps. Extend this dict to add plans.
PLAN_ENTITLEMENTS: dict[str, PlanEntitlements] = {
    "self_hosted": PlanEntitlements(max_api_keys=1),
    "pro": PlanEntitlements(max_api_keys=2),
    "team": PlanEntitlements(max_api_keys=5),
}


def _max_api_keys_override(plan: str) -> int | None:
    """Optional env-var override, e.g. ``API_KEY_LIMIT_PRO=5``.

    Lets ops tune a single plan's cap via env (no code change, no redeploy —
    just a restart). Unset/blank/non-integer falls back to the
    ``PLAN_ENTITLEMENTS`` default above.
    """
    raw = os.getenv(f"API_KEY_LIMIT_{plan.upper()}", "").strip()
    if not raw:
        return None
    try:
        return int(raw)
    except ValueError:
        return None


def entitlements_for_plan(plan: str | None) -> PlanEntitlements:
    """Return the entitlements for ``plan``, or the unlimited default."""
    if not plan:
        return PlanEntitlements()
    key = plan.strip().lower()
    override = _max_api_keys_override(key)
    if override is not None:
        return PlanEntitlements(max_api_keys=override)
    return PLAN_ENTITLEMENTS.get(key, PlanEntitlements())


def api_key_limit_for_plan(plan: str | None) -> int | None:
    """Return the active-API-key cap for ``plan``, or ``None`` for unlimited."""
    return entitlements_for_plan(plan).max_api_keys


def limits_enforced() -> bool:
    """Master kill switch for entitlement enforcement.

    Defaults OFF so the feature can ship dormant and be enabled per environment
    after measuring how many existing tenants already exceed their plan limit.
    """
    return os.getenv("API_KEY_LIMITS_ENFORCED", "false").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )


def is_self_hosted_deployment() -> bool:
    """Whether this backend instance is running as a self-hosted deployment.

    Self-host installs also set ``ENV=production`` (see wiki/Self-Hosting.md)
    so ``ENV`` alone can't distinguish them from managed cloud — this is a
    separate, explicit knob self-host configs set so entitlement checks can
    resolve their plan to ``"self_hosted"`` without trusting ``users.plan``
    (which self-host installs never populate).
    """
    return os.getenv("DEPLOYMENT_MODE", "managed").strip().lower() == "self_hosted"


def embeddings_enabled() -> bool:
    """Whether event indexing and semantic search may call an embedding provider.

    Managed cloud: enabled (tenant/platform embedding config applies).
    Self-hosted OSS: disabled unless ``EMBEDDINGS_ENABLED=true`` — avoids
    silently using the operator's OpenAI key or platform defaults.
    """
    if not is_self_hosted_deployment():
        return True
    return os.getenv("EMBEDDINGS_ENABLED", "false").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
