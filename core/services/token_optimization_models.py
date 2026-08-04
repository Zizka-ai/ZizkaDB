"""Typed domain models for Token Optimization Suggestions.

Plain dataclasses, ``to_dict()`` for the wire shape — mirrors
``services/suggestions/models.py``'s structure but is a **separate, unrelated
type hierarchy** (no shared base with AI-suggestions' ``Evidence``/
``Suggestion``): this feature is 100% deterministic (no LLM call), so coupling
it to the AI-pipeline's grounding/fingerprint machinery would be misleading.
See docs/adr/007-deterministic-token-optimization.md.

``estimated_token_reduction_pct`` definition (documented once, applied
consistently everywhere it's computed): it is the percentage reduction in
*tokens attributable to the specific optimized calls/rows this suggestion is
about* — not a reduction against the agent's total token volume across all
categories. E.g. a model-optimization suggestion's reduction % is computed
only over the (agent, model) group's own tokens, not the agent's grand total.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

CATEGORIES = (
    "high_consumption",
    "model_optimization",
    "cache_opportunity",
    "retry_analysis",
    "cost_anomaly",
)
SEVERITIES = ("critical", "high", "medium", "low")  # no "informational" — not needed here


@dataclass(frozen=True)
class TokenOptimizationSuggestion:
    id: str  # stable slug, e.g. "model_optimization:agentX:gpt-4o"
    title: str
    category: str
    severity: str
    estimated_monthly_savings_usd: float
    estimated_token_reduction_pct: float
    confidence_score: int  # 0-100
    summary: str
    why: str  # deterministic reasoning, cites real numbers
    recommended_action: str
    current_state: dict[str, Any] = field(default_factory=dict)
    recommended_state: dict[str, Any] = field(default_factory=dict)
    affected: dict[str, str | None] = field(default_factory=dict)
    related_report_link: str | None = None
    sample_size: int = 0

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "severity": self.severity,
            "estimated_monthly_savings_usd": self.estimated_monthly_savings_usd,
            "estimated_token_reduction_pct": self.estimated_token_reduction_pct,
            "confidence_score": self.confidence_score,
            "summary": self.summary,
            "why": self.why,
            "recommended_action": self.recommended_action,
            "current_state": self.current_state,
            "recommended_state": self.recommended_state,
            "affected": self.affected,
            "related_report_link": self.related_report_link,
            "sample_size": self.sample_size,
        }


@dataclass
class TokenOptimizationAggregates:
    total_potential_monthly_savings_usd: float
    potential_token_reduction_pct: float
    cost_reduction_pct: float
    optimization_score: int  # 0-100, higher = already well-optimized
    suggestion_count: int
    critical_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_potential_monthly_savings_usd": self.total_potential_monthly_savings_usd,
            "potential_token_reduction_pct": self.potential_token_reduction_pct,
            "cost_reduction_pct": self.cost_reduction_pct,
            "optimization_score": self.optimization_score,
            "suggestion_count": self.suggestion_count,
            "critical_count": self.critical_count,
        }


@dataclass
class TokenOptimizationResult:
    agent: str
    status: str  # "ok" | "no_data"
    period: dict[str, Any]
    aggregates: TokenOptimizationAggregates
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    suggestions: list[TokenOptimizationSuggestion] = field(default_factory=list)
    unpriced_models: list[str] = field(default_factory=list)
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent": self.agent,
            "status": self.status,
            "period": self.period,
            "generated_at": self.generated_at,
            "suggestions": [s.to_dict() for s in self.suggestions],
            "aggregates": self.aggregates.to_dict(),
            "unpriced_models": self.unpriced_models,
            "meta": self.meta,
        }
