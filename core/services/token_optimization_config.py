"""Single source of tunables for the Token Optimization detectors.

Mirrors ``services/ai/config.py``'s ``THRESHOLDS`` dict pattern — every
tunable number lives here, none hardcoded inline in a detector. This module
has no dependency on ``services/ai`` or ``services/suggestions`` — the two
feature families are deliberately unrelated, separate paradigms (this one is
100% deterministic, no LLM call; see docs/adr/007-deterministic-token-optimization.md).
"""

from __future__ import annotations

THRESHOLDS = {
    # Model Optimization
    "model_swap_min_calls": 10,  # min calls on (agent, model) before a swap is suggested
    "model_swap_target_ratio": 0.5,  # candidate must be <= 50% of current combined $/1k
    "model_swap_min_savings_pct": 15.0,  # resulting savings % must clear this floor
    # High Token Consumption
    "high_consumption_share_pct": 40.0,  # cost share of total spend
    "high_consumption_min_cost_usd": 5.0,  # dollar floor suppresses noise on trivial spend
    # Cache Opportunities
    "cache_bucket_width_tokens": 50,  # proxy bucket width for "near-identical" input size
    "cache_min_repeat_count": 5,  # min repeats in a bucket before suggesting caching
    # Retry / Tool-loop Analysis
    "retry_loop_min_repeats": 3,  # matches ai/config.py's THRESHOLDS value
    "retry_min_cost_usd": 0.50,  # dollar floor on wasted-repeat cost
    # Cost Anomalies
    "anomaly_min_zscore": 2.5,  # leave-one-out z-score over trend-bucket costs
    "anomaly_min_cost_usd": 1.0,  # dollar floor on the anomalous bucket's cost
    "anomaly_min_buckets": 5,  # min non-empty trend buckets to compute a meaningful stddev
}

MAX_SUGGESTIONS = 12

# optimization_score = 100 - min(100, round(cost_reduction_pct * OPTIMIZATION_SCORE_WEIGHT))
OPTIMIZATION_SCORE_WEIGHT = 1.5

# Default lookback window when the route's from/to are omitted — mirrors the
# /suggestions default: optimization needs enough history to be meaningful.
DEFAULT_WINDOW_DAYS = 30
