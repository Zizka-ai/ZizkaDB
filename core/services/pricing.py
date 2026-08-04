"""Single source of truth for LLM token pricing (hardcoded, never trusted from client input).

Mirrors ``entitlements.py``'s structure: a small frozen-dataclass value type, a
plain dict keyed by model name, and a pure lookup function. Costs are computed
server-side from real ``input_tokens``/``output_tokens``/``cached_tokens``
reported by the SDK (see ``services/token_usage.py``) — never estimated from
anything else.

Unknown models are a first-class, expected case (a customer's SDK may report a
model this file doesn't know about yet): ``cost_for`` never raises for an
unknown model, it returns ``0.0`` so the rest of the aggregation can proceed,
and the caller is expected to surface the model name in an ``unpriced_models``
list so the UI can tell the user "cost not available" instead of silently
showing a wrong (zero) total as if it were real.

To add/adjust pricing: edit ``MODEL_PRICING`` below. This is the only file
that should contain per-model $/1K-token numbers.
"""

from __future__ import annotations

from dataclasses import dataclass

# Prices are USD per 1,000 tokens. Keep this list to commonly-seen models;
# unknown models fall back to ``DEFAULT_PRICING`` (cost 0) rather than a guess.


@dataclass(frozen=True)
class ModelPricing:
    input_per_1k: float
    output_per_1k: float
    cached_input_per_1k: float = 0.0


MODEL_PRICING: dict[str, ModelPricing] = {
    # Anthropic
    "claude-opus-5": ModelPricing(input_per_1k=0.015, output_per_1k=0.075, cached_input_per_1k=0.0015),
    "claude-sonnet-5": ModelPricing(input_per_1k=0.003, output_per_1k=0.015, cached_input_per_1k=0.0003),
    "claude-haiku-4-5-20251001": ModelPricing(input_per_1k=0.0008, output_per_1k=0.004, cached_input_per_1k=0.00008),
    "claude-opus-4-1": ModelPricing(input_per_1k=0.015, output_per_1k=0.075, cached_input_per_1k=0.0015),
    "claude-sonnet-4-5": ModelPricing(input_per_1k=0.003, output_per_1k=0.015, cached_input_per_1k=0.0003),
    # OpenAI
    "gpt-4o": ModelPricing(input_per_1k=0.0025, output_per_1k=0.01, cached_input_per_1k=0.00125),
    "gpt-4o-mini": ModelPricing(input_per_1k=0.00015, output_per_1k=0.0006, cached_input_per_1k=0.000075),
    "gpt-4-turbo": ModelPricing(input_per_1k=0.01, output_per_1k=0.03),
    "gpt-3.5-turbo": ModelPricing(input_per_1k=0.0005, output_per_1k=0.0015),
    "o1": ModelPricing(input_per_1k=0.015, output_per_1k=0.06),
    "o1-mini": ModelPricing(input_per_1k=0.0011, output_per_1k=0.0044),
    # Google
    "gemini-1.5-pro": ModelPricing(input_per_1k=0.00125, output_per_1k=0.005),
    "gemini-1.5-flash": ModelPricing(input_per_1k=0.000075, output_per_1k=0.0003),
}

# Unknown model → $0 cost, never estimated/guessed. Callers add the model name
# to their own ``unpriced_models`` list so the cost gap is visible in the UI.
DEFAULT_PRICING = ModelPricing(input_per_1k=0.0, output_per_1k=0.0, cached_input_per_1k=0.0)


def is_known_model(model: str | None) -> bool:
    return bool(model) and model in MODEL_PRICING


def cost_for(
    model: str | None,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
) -> float:
    """Dollar cost for one request. Unknown model -> 0.0, never raises.

    Negative token counts (malformed payloads) are clamped to 0 defensively —
    this function must never produce a negative or NaN cost.
    """
    pricing = MODEL_PRICING.get(model, DEFAULT_PRICING) if model else DEFAULT_PRICING
    input_tokens = max(int(input_tokens or 0), 0)
    output_tokens = max(int(output_tokens or 0), 0)
    cached_tokens = max(int(cached_tokens or 0), 0)

    # Cached tokens are billed at the cached rate; the remaining (non-cached)
    # input tokens are billed at the standard input rate.
    non_cached_input = max(input_tokens - cached_tokens, 0)

    cost = (
        non_cached_input / 1000.0 * pricing.input_per_1k
        + cached_tokens / 1000.0 * pricing.cached_input_per_1k
        + output_tokens / 1000.0 * pricing.output_per_1k
    )
    return round(cost, 6)
