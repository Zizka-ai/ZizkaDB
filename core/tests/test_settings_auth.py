"""Tests for GET /v1/settings/embeddings auth."""

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


@patch("api.settings.get_tenant_embedding_config", new_callable=AsyncMock)
def test_embeddings_get_rejects_api_key(mock_config):
    mock_config.return_value = {
        "provider": "openai",
        "model": "text-embedding-3-small",
        "use_platform_key": True,
        "ready": False,
    }
    res = client.get(
        "/v1/settings/embeddings",
        headers={"Authorization": "Bearer zizkadb_live_testkey1234567890123456789012"},
    )
    assert res.status_code == 403
    mock_config.assert_not_called()
