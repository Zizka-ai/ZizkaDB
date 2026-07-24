"""Validation / normalization — the downstream grounding guarantee.

Even though the tool schema already constrains the model, this layer independently
enforces every correctness rule: drop ungrounded or malformed items, clamp
confidence to the cited evidence's strength ceiling, strip unwarranted code
fixes, de-duplicate, cap, and sort. Pure functions — unit-tested without the
model or DB.
"""

from __future__ import annotations

from typing import Any

from services.ai import config
from services.suggestions.models import EvidenceBundle, Suggestion

_SEVERITY_RANK = {s: i for i, s in enumerate(config.SEVERITIES)}  # critical=0 … informational=4


def _clean_str(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _coerce_confidence(value: Any) -> int:
    try:
        return max(0, min(100, int(value)))
    except (TypeError, ValueError):
        return 0


def _validate_one(raw: dict[str, Any], bundle: EvidenceBundle) -> Suggestion | None:
    if not isinstance(raw, dict):
        return None

    category = _clean_str(raw.get("category"))
    severity = _clean_str(raw.get("severity"))
    if category not in config.CATEGORIES or severity not in config.SEVERITIES:
        return None

    valid_ids = set(bundle.signal_ids())
    refs = [r for r in raw.get("evidence", []) if isinstance(r, str) and r in valid_ids]
    if not refs:
        return None  # ungrounded — the anti-hallucination drop

    title = _clean_str(raw.get("title"))
    recommendation = _clean_str(raw.get("recommendation"))
    if not title or not recommendation:
        return None

    # Confidence can never exceed the strongest cited signal's strength.
    ceiling = max(bundle.strength_of(r) for r in refs)
    confidence = min(_coerce_confidence(raw.get("confidence")), ceiling)

    # Code fix only survives on an implementation-class signal with real content.
    code_fix = None
    raw_fix = raw.get("code_fix")
    if (
        isinstance(raw_fix, dict)
        and _clean_str(raw_fix.get("code"))
        and any(r in config.IMPLEMENTATION_SIGNALS for r in refs)
    ):
        code_fix = {
            "language": _clean_str(raw_fix.get("language")) or "text",
            "code": raw_fix.get("code").strip(),
        }

    return Suggestion(
        title=title,
        category=category,
        severity=severity,
        confidence=confidence,
        evidence=refs,
        recommendation=recommendation,
        expected_impact=_clean_str(raw.get("expected_impact")),
        code_fix=code_fix,
    )


def validate_suggestions(raw_list: Any, bundle: EvidenceBundle) -> list[Suggestion]:
    if not isinstance(raw_list, list):
        return []

    validated: list[Suggestion] = []
    for raw in raw_list:
        s = _validate_one(raw, bundle)
        if s is not None:
            validated.append(s)

    # De-duplicate on (category, primary evidence id), keeping the highest confidence.
    best: dict[tuple[str, str], Suggestion] = {}
    for s in validated:
        key = (s.category, s.evidence[0])
        if key not in best or s.confidence > best[key].confidence:
            best[key] = s

    result = sorted(
        best.values(),
        key=lambda s: (_SEVERITY_RANK.get(s.severity, 99), -s.confidence),
    )
    return result[: config.MAX_SUGGESTIONS]
