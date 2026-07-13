import os

import pytest

from services.embedding_config import (
    DEFAULT_MODEL,
    DEFAULT_PROVIDER,
    TenantEmbeddingConfig,
    decrypt_api_key,
    embedding_config_for_response,
    encrypt_api_key,
    list_catalog,
    model_dimensions,
    validate_provider_model,
    _resolve_api_key,
)


def test_list_catalog_contains_default():
    catalog = list_catalog()

    assert "providers" in catalog
    assert catalog["default"]["provider"] == DEFAULT_PROVIDER
    assert catalog["default"]["model"] == DEFAULT_MODEL


def test_validate_provider_model_valid():
    validate_provider_model(
        "openai",
        "text-embedding-3-small",
    )


def test_validate_provider_model_invalid_provider():
    with pytest.raises(ValueError):
        validate_provider_model(
            "invalid",
            "text-embedding-3-small",
        )


def test_validate_provider_model_invalid_model():
    with pytest.raises(ValueError):
        validate_provider_model(
            "openai",
            "bad-model",
        )


def test_model_dimensions():
    assert (
        model_dimensions(
            "openai",
            "text-embedding-3-small",
        )
        == 1536
    )


def test_encrypt_decrypt_roundtrip(monkeypatch):
    monkeypatch.setenv(
        "JWT_SECRET",
        "unit-test-secret",
    )

    key = "sk-test-123456"

    encrypted = encrypt_api_key(key)

    assert encrypted != key

    decrypted = decrypt_api_key(encrypted)

    assert decrypted == key


def test_decrypt_invalid():
    with pytest.raises(ValueError):
        decrypt_api_key("not-a-valid-token")


def test_resolve_platform_key(monkeypatch):
    monkeypatch.setenv(
        "OPENAI_API_KEY",
        "platform-key",
    )

    assert (
        _resolve_api_key(
            True,
            None,
        )
        == "platform-key"
    )


def test_resolve_custom_key(monkeypatch):
    monkeypatch.setenv(
        "JWT_SECRET",
        "unit-test-secret",
    )

    encrypted = encrypt_api_key("custom-key")

    assert (
        _resolve_api_key(
            False,
            encrypted,
        )
        == "custom-key"
    )


def test_embedding_config_for_response(monkeypatch):
    monkeypatch.setenv(
        "OPENAI_API_KEY",
        "platform-key",
    )

    cfg = TenantEmbeddingConfig(
        tenant_id="tenant",
        provider="openai",
        model="text-embedding-3-small",
        use_platform_key=True,
        api_key="platform-key",
    )

    response = embedding_config_for_response(cfg)

    assert response["provider"] == "openai"
    assert response["ready"] is True
    assert response["platform_key_available"] is True