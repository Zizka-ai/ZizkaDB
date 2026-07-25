"""Provider-agnostic contract for suggestion generation.

The engine depends only on `SuggestionProvider`, so swapping Claude for
OpenAI/Gemini/etc. is a new class here — no business-logic change.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class AIProviderError(RuntimeError):
    """Raised when the provider cannot produce a usable response.

    The route maps this to 503 — a provider failure must never surface as a 500
    or leak a stack trace to the client.
    """


class SuggestionProvider(ABC):
    """Turns a deterministic evidence payload into raw suggestion dicts.

    Implementations must NOT invent content — they receive the evidence and the
    tool schema and are responsible only for eliciting structured output from
    the model. Grounding is enforced upstream (the tool schema constrains
    evidence refs) and downstream (the validation layer).
    """

    @abstractmethod
    async def generate(
        self,
        *,
        system_prompt: str,
        evidence_payload: dict[str, Any],
        tool_schema: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        """Return ``(raw_suggestions, meta)``.

        ``meta`` carries observability fields (input/output tokens, retries).
        Raises ``AIProviderError`` on unrecoverable failure.
        """
        raise NotImplementedError
