import httpx
import json
import logging
from typing import Any, Awaitable, Callable

from db.connection import get_redis
from services.embedding_config import (
    EMBEDDING_MODELS,
    TenantEmbeddingConfig,
    VECTOR_SIZE,
    get_tenant_embedding_config,
)

logger = logging.getLogger(__name__)

CACHE_TTL = 86400  # 24 hours

API_KEY_REQUIRED_PROVIDERS = {
     "openai",
}     

EmbeddingProvider = Callable[
    [str, TenantEmbeddingConfig],
    Awaitable[list[float] | None],
]


async def generate_embedding(text: str, tenant_id: str) -> list[float] | None:
    """Generate embedding using the tenant's configured provider/model."""
    config = await get_tenant_embedding_config(tenant_id)
    return await generate_embedding_with_config(text, config)


async def generate_embedding_with_config(
    text: str,
    config: TenantEmbeddingConfig,
) -> list[float] | None:
    if (
        config.provider in API_KEY_REQUIRED_PROVIDERS
        and not config.api_key
    ):
        logger.warning(
            "No embedding API key for tenant %s (platform=%s)",
            config.tenant_id,
            config.use_platform_key,
        )
        return None

    cache_key = f"emb:{config.provider}:{config.model}:{hash(text)}"

    try:
        redis = get_redis()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    provider = EMBEDDING_PROVIDERS.get(config.provider)
    if provider is None:
        logger.warning("Unsupported embedding provider: %s", config.provider)
        return None

    try:
        embedding = await provider(text, config)

        if not embedding:
            return None

        if len(embedding) != VECTOR_SIZE:
            logger.warning(
                "Embedding dimension %s != %s for tenant %s",
                len(embedding),
                VECTOR_SIZE,
                config.tenant_id,
            )
            return None

        try:
            redis = get_redis()
            await redis.setex(cache_key, CACHE_TTL, json.dumps(embedding))
        except Exception:
            pass

        return embedding

    except Exception as e:
        logger.warning(
            "Embedding generation failed for tenant %s: %s",
            config.tenant_id,
            e,
        )
        return None


async def _openai_embedding(
    text: str,
    config: TenantEmbeddingConfig,
) -> list[float] | None:
    payload: dict = {
        "input": text,
        "model": config.model,
    }

    for model in EMBEDDING_MODELS.get("openai", []):
        if (
            model["id"] == config.model
            and model.get("dimensions_param") is not None
        ):
            payload["dimensions"] = model["dimensions_param"]
            break

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/embeddings",
            headers={
                "Authorization": f"Bearer {config.api_key}",
            },
            json=payload,
        )

        response.raise_for_status()

        return response.json()["data"][0]["embedding"]


EMBEDDING_PROVIDERS: dict[str, EmbeddingProvider] = {
    "openai": _openai_embedding,
}


def _flatten_data(value: Any, prefix: str = "") -> list[str]:
    """
    Recursively flatten nested dictionaries and lists into
    key:value strings suitable for semantic embeddings.

    Example:
        {"user": {"city": "Paris"}}
            -> ["user.city:Paris"]

        {"docs": ["a", "b"]}
            -> ["docs.0:a", "docs.1:b"]
    """

    parts: list[str] = []

    if isinstance(value, dict):
        for key, item in value.items():
            new_prefix = f"{prefix}.{key}" if prefix else key
            parts.extend(_flatten_data(item, new_prefix))

    elif isinstance(value, list):
        for index, item in enumerate(value):
            new_prefix = f"{prefix}.{index}" if prefix else str(index)
            parts.extend(_flatten_data(item, new_prefix))

    elif isinstance(value, (str, int, float, bool)):
        parts.append(f"{prefix}:{value}")

    return parts


def event_to_text(event_type: str, data: dict) -> str:
    """
    Convert an event into a semantic text representation
    for embedding generation.

    Supports nested dictionaries and lists.
    """

    parts = [f"event_type:{event_type}"]
    parts.extend(_flatten_data(data))

    return " ".join(parts)
