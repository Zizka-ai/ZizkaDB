"""Suggestions engine — orchestrates evidence → model → validation → cache.

Deterministic evidence is extracted first; if nothing crosses a threshold we
return ``no_evidence`` WITHOUT calling the model. Otherwise we serve from the
evidence-fingerprint cache, or generate + validate + cache. A short Redis lock
coalesces concurrent identical requests so only one model call runs.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
from datetime import datetime
from typing import Any

from services.ai import config
from services.ai.claude_provider import ClaudeSuggestionProvider
from services.ai.provider import SuggestionProvider
from services.suggestions import prompt as prompt_builder
from services.suggestions.evidence import extract_evidence
from services.suggestions.models import Evidence, Suggestion, SuggestionsResult
from services.suggestions.validation import validate_suggestions

logger = logging.getLogger(__name__)


def _result_from_cache(cached: dict[str, Any]) -> SuggestionsResult:
    result = SuggestionsResult(
        agent=cached["agent"],
        status=cached["status"],
        period=cached["period"],
        model=cached.get("model"),
        generated_at=cached["generated_at"],
        suggestions=[Suggestion(**{k: v for k, v in s.items()}) for s in cached.get("suggestions", [])],
        evidence=[Evidence(**e) for e in cached.get("evidence", [])],
        meta={**cached.get("meta", {}), "from_cache": True},
    )
    return result


async def _read_cache(redis, key: str) -> SuggestionsResult | None:
    if redis is None:
        return None
    try:
        raw = await redis.get(key)
        if raw:
            return _result_from_cache(json.loads(raw))
    except Exception:  # cache must never break the request
        pass
    return None


async def _write_cache(redis, key: str, result: SuggestionsResult) -> None:
    if redis is None:
        return
    try:
        await redis.setex(key, config.CACHE_TTL_SECONDS, json.dumps(result.to_dict()))
    except Exception:
        pass


async def get_suggestions(
    pool,
    redis,
    tenant_id: str,
    agent_id: str,
    from_dt: datetime,
    to_dt: datetime,
    *,
    refresh: bool = False,
    provider: SuggestionProvider | None = None,
) -> SuggestionsResult:
    started = time.perf_counter()
    bundle = await extract_evidence(pool, tenant_id, agent_id, from_dt, to_dt)

    if bundle.is_empty():
        return SuggestionsResult(agent=agent_id, status="no_evidence", period=bundle.period, evidence=[])

    model = config.anthropic_model()
    fingerprint = bundle.fingerprint(model)
    cache_key = f"{config.CACHE_PREFIX}:{fingerprint}"
    lock_key = f"{cache_key}:lock"

    if not refresh:
        hit = await _read_cache(redis, cache_key)
        if hit is not None:
            logger.info("suggestions cache hit agent=%s", agent_id)
            return hit

    # Coalesce concurrent identical requests: whoever gets the lock generates;
    # others briefly wait and serve the freshly-written cache.
    have_lock = True
    if redis is not None and not refresh:
        try:
            have_lock = bool(await redis.set(lock_key, "1", nx=True, ex=config.LOCK_TTL_SECONDS))
        except Exception:
            have_lock = True
        if not have_lock:
            await asyncio.sleep(1.0)
            hit = await _read_cache(redis, cache_key)
            if hit is not None:
                return hit  # someone else produced it

    try:
        provider = provider or ClaudeSuggestionProvider()
        raw, meta = await provider.generate(
            system_prompt=prompt_builder.build_system_prompt(),
            evidence_payload=bundle.to_payload(),
            tool_schema=prompt_builder.build_tool_schema(bundle),
        )
        suggestions = validate_suggestions(raw, bundle)
    finally:
        if redis is not None and have_lock:
            try:
                await redis.delete(lock_key)
            except Exception:
                pass

    analysis_ms = round((time.perf_counter() - started) * 1000)
    result = SuggestionsResult(
        agent=agent_id,
        status="ok",
        period=bundle.period,
        model=model,
        suggestions=suggestions,
        evidence=bundle.evidence,
        meta={
            "from_cache": False,
            "evidence_count": len(bundle.evidence),
            "suggestion_count": len(suggestions),
            "analysis_ms": analysis_ms,
            "input_tokens": meta.get("input_tokens"),
            "output_tokens": meta.get("output_tokens"),
            "retries": meta.get("retries"),
        },
    )
    logger.info(
        "suggestions generated agent=%s evidence=%d suggestions=%d ms=%d tokens_in=%s tokens_out=%s retries=%s",
        agent_id, len(bundle.evidence), len(suggestions), analysis_ms,
        meta.get("input_tokens"), meta.get("output_tokens"), meta.get("retries"),
    )
    await _write_cache(redis, cache_key, result)
    return result
