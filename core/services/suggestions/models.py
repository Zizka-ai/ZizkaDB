"""Typed domain models for the suggestions feature.

Plain dataclasses (no ORM) with explicit ``to_dict`` for the JSON response, so
the wire shape is stable and mirrored 1:1 on the frontend.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass(frozen=True)
class Evidence:
    """One deterministically-detected signal — the only thing Claude may cite.

    ``strength`` (0-100) reflects how well-supported the signal is (sample size,
    rate, recurrence); it caps the confidence of any suggestion citing it.
    """

    id: str
    category: str  # the primary category this signal maps to
    label: str
    summary: str  # one factual sentence, safe to show the user
    metrics: dict[str, Any] = field(default_factory=dict)
    samples: list[str] = field(default_factory=list)
    strength: int = 50

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "category": self.category,
            "label": self.label,
            "summary": self.summary,
            "metrics": self.metrics,
            "samples": self.samples,
            "strength": self.strength,
        }


@dataclass
class EvidenceBundle:
    agent: str
    period: dict[str, Any]  # {from, to, days}
    summary: dict[str, Any]
    evidence: list[Evidence] = field(default_factory=list)
    coverage: dict[str, Any] = field(default_factory=dict)

    def signal_ids(self) -> list[str]:
        return [e.id for e in self.evidence]

    def strength_of(self, signal_id: str) -> int:
        for e in self.evidence:
            if e.id == signal_id:
                return e.strength
        return 0

    def is_empty(self) -> bool:
        return len(self.evidence) == 0

    def to_payload(self) -> dict[str, Any]:
        """Deterministic, model-facing payload (sorted for a stable fingerprint)."""
        return {
            "agent": self.agent,
            "period": self.period,
            "summary": self.summary,
            "coverage": self.coverage,
            "evidence": [e.to_dict() for e in sorted(self.evidence, key=lambda x: x.id)],
        }

    def fingerprint(self, model: str) -> str:
        raw = json.dumps({"model": model, **self.to_payload()}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()


@dataclass
class Suggestion:
    title: str
    category: str
    severity: str
    confidence: int
    evidence: list[str]  # signal ids this suggestion is grounded in
    recommendation: str
    expected_impact: str
    code_fix: dict[str, str] | None = None  # {language, code}

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "title": self.title,
            "category": self.category,
            "severity": self.severity,
            "confidence": self.confidence,
            "evidence": self.evidence,
            "recommendation": self.recommendation,
            "expected_impact": self.expected_impact,
        }
        if self.code_fix:
            d["code_fix"] = self.code_fix
        return d


@dataclass
class SuggestionsResult:
    agent: str
    status: str  # ok | no_evidence | ai_not_configured
    period: dict[str, Any]
    model: str | None = None
    generated_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    suggestions: list[Suggestion] = field(default_factory=list)
    evidence: list[Evidence] = field(default_factory=list)  # echoed so the UI can show the facts
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "agent": self.agent,
            "status": self.status,
            "period": self.period,
            "model": self.model,
            "generated_at": self.generated_at,
            "suggestions": [s.to_dict() for s in self.suggestions],
            "evidence": [e.to_dict() for e in self.evidence],
            "meta": self.meta,
        }
