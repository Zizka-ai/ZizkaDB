"""
Unit tests for POST /v1/demo-requests — source validation, position, honeypot.
Rate limiting is covered in test_rate_limiting.py.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from api.demo_requests import _rate as demo_rate
from main import app

client = TestClient(app)

VALID_PAYLOAD = {
    "first_name": "Ada",
    "last_name": "Lovelace",
    "email": "ada@example.com",
    "company_name": "Analytical Engines Ltd",
    "website": "https://example.com",
    "botcheck": "",
}


def _mock_pool_row():
    mock_pool = MagicMock()
    mock_row = {
        "request_id": "11111111-1111-1111-1111-111111111111",
        "created_at": datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc),
    }
    mock_pool.fetchrow = AsyncMock(return_value=mock_row)
    return mock_pool


class TestDemoRequests:
    def setup_method(self):
        demo_rate.clear()

    @patch("api.demo_requests.get_pool")
    def test_create_minimal_fields(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool_row()
        response = client.post("/v1/demo-requests", json=VALID_PAYLOAD)
        assert response.status_code == 201
        body = response.json()
        assert "id" in body
        assert "created_at" in body

    @patch("api.demo_requests.get_pool")
    def test_create_with_enterprise_source_and_position(self, mock_get_pool):
        mock_pool = _mock_pool_row()
        mock_get_pool.return_value = mock_pool
        response = client.post(
            "/v1/demo-requests",
            json={
                **VALID_PAYLOAD,
                "source": "enterprise",
                "position": "Head of Platform",
            },
        )
        assert response.status_code == 201
        call_args = mock_pool.fetchrow.call_args[0]
        # position is 6th positional arg ($6), source is 7th ($7)
        assert call_args[6] == "Head of Platform"
        assert call_args[7] == "enterprise"

    @patch("api.demo_requests.get_pool")
    def test_valid_sources_accepted(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool_row()
        for source in ("enterprise", "landing", "newsletter"):
            demo_rate.clear()
            response = client.post(
                "/v1/demo-requests",
                json={**VALID_PAYLOAD, "source": source},
            )
            assert response.status_code == 201, source

    @patch("api.demo_requests.get_pool")
    def test_invalid_source_rejected(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool_row()
        response = client.post(
            "/v1/demo-requests",
            json={**VALID_PAYLOAD, "source": "spam"},
        )
        assert response.status_code == 422
        assert response.json()["detail"] == "Invalid source"

    @patch("api.demo_requests.get_pool")
    def test_empty_source_treated_as_null(self, mock_get_pool):
        mock_pool = _mock_pool_row()
        mock_get_pool.return_value = mock_pool
        response = client.post(
            "/v1/demo-requests",
            json={**VALID_PAYLOAD, "source": "   "},
        )
        assert response.status_code == 201
        call_args = mock_pool.fetchrow.call_args[0]
        assert call_args[7] is None

    @patch("api.demo_requests.get_pool")
    def test_honeypot_rejected(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool_row()
        response = client.post(
            "/v1/demo-requests",
            json={**VALID_PAYLOAD, "botcheck": "bot"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid submission"

    @patch("api.demo_requests.get_pool")
    def test_whitespace_trimmed(self, mock_get_pool):
        mock_pool = _mock_pool_row()
        mock_get_pool.return_value = mock_pool
        response = client.post(
            "/v1/demo-requests",
            json={
                **VALID_PAYLOAD,
                "first_name": "  Ada  ",
                "last_name": "  Lovelace  ",
                "email": "  Ada@Example.COM  ",
                "company_name": "  Analytical Engines  ",
                "website": "  https://example.com  ",
                "position": "  CTO  ",
                "source": "enterprise",
            },
        )
        assert response.status_code == 201
        args = mock_pool.fetchrow.call_args[0]
        assert args[1] == "Ada"
        assert args[2] == "Lovelace"
        assert args[3] == "ada@example.com"
        assert args[4] == "Analytical Engines"
        assert args[5] == "https://example.com"
        assert args[6] == "CTO"
        assert args[7] == "enterprise"

    @patch("api.demo_requests.get_pool")
    def test_optional_position_omitted(self, mock_get_pool):
        mock_pool = _mock_pool_row()
        mock_get_pool.return_value = mock_pool
        response = client.post("/v1/demo-requests", json=VALID_PAYLOAD)
        assert response.status_code == 201
        args = mock_pool.fetchrow.call_args[0]
        assert args[6] is None
        assert args[7] is None

    @patch("api.demo_requests.get_pool")
    def test_missing_required_field_rejected(self, mock_get_pool):
        mock_get_pool.return_value = _mock_pool_row()
        payload = {**VALID_PAYLOAD}
        del payload["company_name"]
        response = client.post("/v1/demo-requests", json=payload)
        assert response.status_code == 422
