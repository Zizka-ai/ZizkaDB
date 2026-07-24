"""Prompt + per-request tool schema for suggestion generation.

The system prompt pins the model to the supplied evidence and the fixed
vocabularies. The tool schema is built per request so the ``evidence`` field can
only take the signal ids that are actually in this bundle — making a fabricated
reference structurally impossible, not merely rejected afterwards.
"""

from __future__ import annotations

from typing import Any

from services.ai import config
from services.suggestions.models import EvidenceBundle

_TOOL_NAME = "emit_suggestions"

SYSTEM_PROMPT = (
    "You are an expert AI-agent reliability engineer reviewing one agent's observed behaviour.\n"
    "\n"
    "You are given a fixed set of EVIDENCE signals that were computed deterministically from the "
    "agent's real execution history. Your job is to turn those signals into concrete, actionable "
    "engineering suggestions.\n"
    "\n"
    "STRICT RULES — follow every one:\n"
    "1. Use ONLY the supplied evidence. Never invent problems, metrics, or numbers that are not in "
    "the evidence. If the evidence does not support a suggestion, do not make it.\n"
    "2. Every suggestion MUST cite one or more evidence signal ids in its `evidence` field, chosen "
    "only from the provided enum. Do not reference a signal that is not present.\n"
    "3. Prefer one focused suggestion per distinct signal. Do not pad the list or repeat advice.\n"
    "4. `category` and `severity` must be from the provided enums.\n"
    "5. `confidence` (0-100) must reflect how strongly the evidence supports the suggestion; when a "
    "signal has a low `strength`, keep confidence low.\n"
    "6. `expected_impact`: only state a quantitative improvement if the number is derivable from the "
    "evidence (e.g. the recorded token total, coverage %, error rate, counts). Otherwise describe the "
    "impact qualitatively. Never fabricate a percentage.\n"
    "7. Provide a `code_fix` ONLY when the signal is clearly implementation-related and a concrete, "
    "correct snippet genuinely helps. Never guess code for a vague signal.\n"
    "8. Be concise and specific. Avoid generic AI advice.\n"
    "\n"
    "Return your suggestions by calling the `emit_suggestions` tool. If the evidence does not warrant "
    "any suggestion, return an empty list."
)


def build_system_prompt() -> str:
    return SYSTEM_PROMPT


def build_tool_schema(bundle: EvidenceBundle) -> dict[str, Any]:
    signal_ids = bundle.signal_ids()
    return {
        "name": _TOOL_NAME,
        "description": "Emit evidence-grounded improvement suggestions for the agent.",
        "input_schema": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "suggestions": {
                    "type": "array",
                    "maxItems": config.MAX_SUGGESTIONS,
                    "items": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "title": {"type": "string"},
                            "category": {"type": "string", "enum": list(config.CATEGORIES)},
                            "severity": {"type": "string", "enum": list(config.SEVERITIES)},
                            "confidence": {"type": "integer", "minimum": 0, "maximum": 100},
                            "evidence": {
                                "type": "array",
                                "minItems": 1,
                                "items": {"type": "string", "enum": signal_ids},
                            },
                            "recommendation": {"type": "string"},
                            "expected_impact": {"type": "string"},
                            "code_fix": {
                                "type": "object",
                                "additionalProperties": False,
                                "properties": {
                                    "language": {"type": "string"},
                                    "code": {"type": "string"},
                                },
                                "required": ["language", "code"],
                            },
                        },
                        "required": [
                            "title",
                            "category",
                            "severity",
                            "confidence",
                            "evidence",
                            "recommendation",
                            "expected_impact",
                        ],
                    },
                }
            },
            "required": ["suggestions"],
        },
    }
