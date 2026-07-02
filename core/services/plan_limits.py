"""Single source of truth for per-plan API key limits.

Only the plans listed in ``API_KEY_LIMITS`` are capped. Anything else
(free, unknown, ``pending_checkout``) is treated as unlimited.

Adding a new plan (e.g. ``"enterprise"``) is a one-line change here — no
business logic elsewhere needs to change.
"""

from __future__ import annotations

import os

# ``None`` means "no cap".
UNLIMITED: int | None = None

# The only plans with an API key cap. Extend this dict to add plans.
API_KEY_LIMITS: dict[str, int] = {
    "pro": 3,
    "team": 10,
}


def api_key_limit_for_plan(plan: str | None) -> int | None:
    """Return the active-API-key cap for ``plan``, or ``None`` for unlimited."""
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
