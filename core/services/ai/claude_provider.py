"""Anthropic Claude implementation of ``SuggestionProvider``.

Uses the Messages API over ``httpx`` (the codebase convention — no provider SDK,
mirroring ``services/embeddings.py``). Structured output is obtained with a
single **forced tool call**, which works on Sonnet 4.6 and any future model and
guarantees a parseable, schema-constrained result.

The raw HTTP call lives in module-level ``_anthropic_messages`` and is resolved
from ``globals()`` at call time, so tests monkeypatch it exactly like the
embeddings provider.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

import httpx

from services.ai import config
from services.ai.provider import AIProviderError, SuggestionProvider

logger = logging.getLogger(__name__)

_TOOL_NAME = "emit_suggestions"


async def _anthropic_messages(payload: dict[str, Any]) -> dict[str, Any]:
    """Single POST to the Messages API. Raises on transport/HTTP error.

    Kept as a module-level function so tests can monkeypatch it with an
    ``AsyncMock`` returning a canned response (see ``_call_with_retries``).
    """
    api_key = config.anthropic_api_key()
    if not api_key:
        raise AIProviderError("ANTHROPIC_API_KEY is not configured")

    async with httpx.AsyncClient(timeout=config.REQUEST_TIMEOUT_SECONDS) as client:
        resp = await client.post(
            f"{config.ANTHROPIC_BASE_URL}/v1/messages",
            headers={
                "x-api-key": api_key,
                "anthropic-version": config.ANTHROPIC_VERSION,
                "content-type": "application/json",
            },
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def _call_with_retries(payload: dict[str, Any]) -> tuple[dict[str, Any], int]:
    """Call the API with backoff on 429/5xx/network. Returns (response, retries)."""
    last_exc: Exception | None = None
    for attempt in range(config.MAX_RETRIES):
        try:
            # Resolve at call time so monkeypatch of the module attr takes effect.
            fn = globals()["_anthropic_messages"]
            return await fn(payload), attempt
        except httpx.HTTPStatusError as exc:
            status = exc.response.status_code
            if status == 429 or status >= 500:
                last_exc = exc
                retry_after = _retry_after_seconds(exc.response, attempt)
                logger.warning(
                    "Claude %s on attempt %s/%s; retrying in %.1fs",
                    status, attempt + 1, config.MAX_RETRIES, retry_after,
                )
                await asyncio.sleep(retry_after)
                continue
            # 4xx (e.g. 404 bad model, 400 bad request) — not retryable.
            raise AIProviderError(f"Claude request failed ({status})") from exc
        except (httpx.TimeoutException, httpx.TransportError) as exc:
            last_exc = exc
            await asyncio.sleep(_backoff_seconds(attempt))
            continue
    raise AIProviderError("Claude request failed after retries") from last_exc


def _retry_after_seconds(response: httpx.Response, attempt: int) -> float:
    header = response.headers.get("retry-after")
    if header:
        try:
            return min(float(header), 30.0)
        except ValueError:
            pass
    return _backoff_seconds(attempt)


def _backoff_seconds(attempt: int) -> float:
    return min(2.0 ** attempt, 15.0)


def _extract_tool_input(response: dict[str, Any]) -> dict[str, Any]:
    """Pull the forced tool's input from the response, guarding every branch."""
    stop_reason = response.get("stop_reason")
    if stop_reason == "refusal":
        raise AIProviderError("Claude declined to analyse this request")
    for block in response.get("content", []):
        if block.get("type") == "tool_use" and block.get("name") == _TOOL_NAME:
            inp = block.get("input")
            if isinstance(inp, dict):
                return inp
    # No tool_use block — includes the truncated (max_tokens) case, handled by caller.
    raise AIProviderError("Claude returned no structured suggestions")


def _usage_meta(response: dict[str, Any], retries: int) -> dict[str, Any]:
    usage = response.get("usage") or {}
    return {
        "input_tokens": usage.get("input_tokens"),
        "output_tokens": usage.get("output_tokens"),
        "retries": retries,
        "model": response.get("model"),
        "request_id": response.get("id"),
    }


class ClaudeSuggestionProvider(SuggestionProvider):
    async def generate(
        self,
        *,
        system_prompt: str,
        evidence_payload: dict[str, Any],
        tool_schema: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], dict[str, Any]]:
        import json

        base_payload: dict[str, Any] = {
            "model": config.anthropic_model(),
            "temperature": config.TEMPERATURE,
            "system": system_prompt,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Analyse this agent evidence and emit suggestions:\n"
                            + json.dumps(evidence_payload, sort_keys=True),
                        }
                    ],
                }
            ],
            "tools": [tool_schema],
            "tool_choice": {"type": "tool", "name": _TOOL_NAME},
        }

        # First attempt at the normal cap; on a truncated response, one retry with
        # a larger cap (bounded output means this is rare).
        for max_tokens in (config.MAX_TOKENS, config.MAX_TOKENS_RETRY):
            payload = {**base_payload, "max_tokens": max_tokens}
            response, retries = await _call_with_retries(payload)
            if response.get("stop_reason") == "max_tokens" and max_tokens != config.MAX_TOKENS_RETRY:
                logger.warning("Claude response truncated; retrying with higher max_tokens")
                continue
            tool_input = _extract_tool_input(response)
            suggestions = tool_input.get("suggestions")
            if not isinstance(suggestions, list):
                raise AIProviderError("Claude tool output missing a suggestions array")
            return suggestions, _usage_meta(response, retries)

        raise AIProviderError("Claude response remained truncated after retry")
