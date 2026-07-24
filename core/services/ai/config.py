"""Single source of AI/suggestions configuration.

Everything tunable — model, endpoint, retry/timeout policy, cache TTL, output
caps, and the detector thresholds — lives here so a future change touches one
file. Read from the environment the same way the embeddings service reads its
key (plain ``os.getenv``; there is no Settings class in this codebase).
"""

from __future__ import annotations

import os


# ── Anthropic client config ────────────────────────────────────────────────

ANTHROPIC_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
ANTHROPIC_VERSION = os.getenv("ANTHROPIC_VERSION", "2023-06-01")
DEFAULT_MODEL = "claude-sonnet-4-6"

# Request shape: deterministic (temperature 0), no thinking, bounded output.
TEMPERATURE = 0.0
MAX_TOKENS = 8192
# One retry with a larger cap if the first response is truncated mid-JSON.
MAX_TOKENS_RETRY = 12000
REQUEST_TIMEOUT_SECONDS = 60.0
MAX_RETRIES = 3  # for 429 / 5xx / network


def anthropic_api_key() -> str | None:
    """Read at call time (not import) so tests and runtime env changes apply."""
    key = os.getenv("ANTHROPIC_API_KEY")
    return key.strip() if key else None


def anthropic_model() -> str:
    return os.getenv("ANTHROPIC_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL


def ai_configured() -> bool:
    return bool(anthropic_api_key())


# ── Suggestions engine config ──────────────────────────────────────────────

CACHE_TTL_SECONDS = 24 * 60 * 60  # 24h; evidence-fingerprint keys bust on data change
CACHE_PREFIX = "suggestions"
LOCK_TTL_SECONDS = 90  # SET NX lock to coalesce concurrent identical requests
MAX_SUGGESTIONS = 12  # cap what we render (and what Claude may return)

# Evidence sent to the model is aggregates + a few short, scrubbed samples.
MAX_SAMPLES_PER_SIGNAL = 5
MAX_SAMPLE_CHARS = 200

# ── Vocabulary (mirrored on the frontend) ──────────────────────────────────

SEVERITIES = ("critical", "high", "medium", "low", "informational")
CATEGORIES = (
    "general",
    "token_optimization",
    "error_prevention",
    "performance",
    "reliability",
    "code",
)
# Only these signal classes may carry a code_fix.
IMPLEMENTATION_SIGNALS = frozenset(
    {
        "recurring_errors",
        "retry_loops",
        "duplicate_tool_calls",
        "missing_sessions",
        "invalid_tool_arguments",
        "empty_responses",
        "timeouts",
        "api_failures",
    }
)

# ── Detector thresholds (all noise-suppression lives here) ─────────────────
# A signal is only emitted when it crosses its threshold, so small/insignificant
# patterns never become suggestions.

THRESHOLDS = {
    "min_events": 20,  # below this, the window is too small to analyse
    "error_rate_pct": 5.0,  # low success-rate signal
    "recurring_error_min_count": 3,  # a specific error must recur this many times
    "retry_loop_min_repeats": 3,  # consecutive identical events in a session
    "duplicate_tool_min_count": 3,
    "long_chain_depth": 12,  # causal chain depth that suggests over-reasoning
    "missing_session_pct": 40.0,  # fraction of events with no session_id
    "slow_session_seconds": 300,  # session duration outlier
    "sparse_active_days": 2,  # very little activity across the window
    "high_latency_ms": 5000,  # opt-in: data.latency_ms / duration_ms
}
