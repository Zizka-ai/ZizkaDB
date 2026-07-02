"""Single source of truth for per-plan API key limits.

Only the plans listed in ``API_KEY_LIMITS`` are capped. Anything else
(self-host, free, unknown, ``pending_checkout``) is treated as unlimited.

Adding a new plan (e.g. ``"enterprise"``) is a one-line change here — no
business logic elsewhere needs to change.
"""

from __future__ import annotations

import os

# ``None`` means "no cap". Used for self-host and any plan not listed below.
UNLIMITED: int | None = None

# The only plans with an API key cap. Extend this dict to add plans.
API_KEY_LIMITS: dict[str, int] = {
    "pro": 3,
    "team": 10,
}


def api_key_limit_for_plan(plan: str | None, *, billing_enforced: bool) -> int | None:
    """Return the active-API-key cap for ``plan``, or ``None`` for unlimited.

    ``billing_enforced=False`` (self-host / local dev) is always unlimited,
    regardless of any stored plan value — self-host users are backfilled as
    ``'pro'`` (see ``core/db/connection.py``), so plan alone must never gate them.
    """
    if not billing_enforced:
        return UNLIMITED
    if not plan:
        return UNLIMITED
    return API_KEY_LIMITS.get(plan.strip().lower(), UNLIMITED)


def limits_enforced() -> bool:
    """Master kill switch for API key limit enforcement.

    Defaults OFF so the feature can ship dormant and be enabled per environment
    after measuring how many existing tenants already exceed their plan limit.
    """
    return os.getenv("API_KEY_LIMITS_ENFORCED", "false").strip().lower() in (
        "1",
        "true",
        "yes",
        "on",
    )
