import hashlib
import subprocess
import sys
from pathlib import Path
from unittest.mock import AsyncMock

import pytest

from services.embedding_config import TenantEmbeddingConfig
from services.embeddings import event_to_text, generate_embedding_with_config

CORE_DIR = Path(__file__).resolve().parents[1]


def test_event_to_text_includes_primitives():
    text = event_to_text(
        "tool_call",
        {
            "tool": "weather",
            "temperature": 22,
            "success": True,
        },
    )

    assert "event_type:tool_call" in text
    assert "tool:weather" in text
    assert "temperature:22" in text
    assert "success:True" in text


def test_event_to_text_nested_dict():
    text = event_to_text(
        "tool_call",
        {
            "arguments": {
                "city": "Paris",
                "country": "France",
            }
        },
    )

    assert "arguments.city:Paris" in text
    assert "arguments.country:France" in text


def test_event_to_text_lists():
    text = event_to_text(
        "retrieval",
        {
            "documents": [
                "doc1",
                "doc2",
            ]
        },
    )

    assert "documents.0:doc1" in text
    assert "documents.1:doc2" in text


def _cache_key_in_subprocess(text: str) -> str:
    """Run the cache-key computation in a fresh interpreter so PYTHONHASHSEED
    randomization (which varies builtin hash() per process, but not
    hashlib.sha256()) is actually exercised, the way separate uvicorn
    workers would see it."""
    code = (
        "import sys; sys.path.insert(0, %r); "
        "from services.embeddings import _cache_key_for; "
        "print(_cache_key_for('openai', 'text-embedding-3-small', %r))"
    ) % (str(CORE_DIR), text)
    result = subprocess.run(
        [sys.executable, "-c", code],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def test_embedding_cache_key_stable_across_processes():
    """Regression test for the cache-key bug called out in core/CLAUDE.md:
    using builtin hash(text) instead of hashlib.sha256 makes the Redis
    embedding cache key differ per worker process (PYTHONHASHSEED is
    randomized per process by default), so cache reads across workers
    almost always miss. sha256 must be stable regardless of process."""
    key_a = _cache_key_in_subprocess("hello world")
    key_b = _cache_key_in_subprocess("hello world")

    assert key_a == key_b
    expected_hash = hashlib.sha256("hello world".encode()).hexdigest()
    assert expected_hash in key_a


@pytest.mark.asyncio
async def test_generate_embedding_uses_sha256_cache_key(monkeypatch):
    """The cache key written to/read from Redis must be derived from
    hashlib.sha256, not the process-unstable builtin hash()."""
    config = TenantEmbeddingConfig(
        tenant_id="tenant1",
        provider="openai",
        model="text-embedding-3-small",
        use_platform_key=True,
        api_key="sk-test",
    )

    redis = AsyncMock()
    redis.get.return_value = None
    monkeypatch.setattr("services.embeddings.get_redis", lambda: redis)
    monkeypatch.setattr(
        "services.embeddings._openai_embedding",
        AsyncMock(return_value=[0.1] * 1536),
    )

    await generate_embedding_with_config("hello world", config)

    expected_hash = hashlib.sha256("hello world".encode()).hexdigest()
    get_key = redis.get.call_args[0][0]
    setex_key = redis.setex.call_args[0][0]

    assert expected_hash in get_key
    assert get_key == setex_key