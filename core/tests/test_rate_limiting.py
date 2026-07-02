"""
Unit tests for ZizkaDB Core API rate limiters.
Tests cover OTP request limits, Demo request limits, and Community board limits.
"""

from unittest.mock import patch, AsyncMock, MagicMock
from datetime import datetime, timezone
from fastapi.testclient import TestClient

from main import app
from api.auth import _otp_rate, _OTP_RATE_MAX, _OTP_RATE_WINDOW_SEC
from api.demo_requests import _rate as demo_rate, RATE_MAX as DEMO_MAX, RATE_WINDOW_SEC as DEMO_WINDOW
from api.community import _rate as community_rate, RATE_MAX_POSTS as COMM_MAX, RATE_WINDOW_SEC as COMM_WINDOW

client = TestClient(app)


# ──────────────────────────────────────────────────────────────────────────────
# OTP Request Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestOTPRateLimiting:
    def setup_method(self):
        # Clear the in-memory rate dictionary before each test
        _otp_rate.clear()

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_under_limit(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        # Set up a fixed time
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send max allowed requests
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200
                assert response.json() == {"message": "Code sent"}
            
            assert mock_request_otp.call_count == _OTP_RATE_MAX

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_exceed_limit(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send up to the limit
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200

            # The next request should be blocked
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 429
            assert "Too many code requests" in response.json()["detail"]

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_partitioned_by_email(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send up to the limit for user1
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user1@example.com"})
                assert response.status_code == 200

            # Next request for user1 is rate-limited
            response = client.post("/v1/auth/request-otp", json={"email": "user1@example.com"})
            assert response.status_code == 429

            # But request for user2 should succeed
            response = client.post("/v1/auth/request-otp", json={"email": "user2@example.com"})
            assert response.status_code == 200

    @patch("api.auth.email_exists", new_callable=AsyncMock)
    @patch("api.auth.request_otp", new_callable=AsyncMock)
    def test_otp_requests_window_expiry(self, mock_request_otp, mock_exists):
        mock_exists.return_value = True
        start_time = 1000000.0
        
        # We use a mutable container to simulate advancing time
        current_time = [start_time]
        def get_time():
            return current_time[0]

        with patch("time.time", side_effect=get_time):
            # Fill up the limit
            for _ in range(_OTP_RATE_MAX):
                response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
                assert response.status_code == 200

            # Next request is blocked
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 429

            # Advance time past the 15-minute window
            current_time[0] += _OTP_RATE_WINDOW_SEC + 1

            # Request should now succeed again
            response = client.post("/v1/auth/request-otp", json={"email": "user@example.com"})
            assert response.status_code == 200


# ──────────────────────────────────────────────────────────────────────────────
# Demo Requests Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestDemoRequestsRateLimiting:
    def setup_method(self):
        demo_rate.clear()

    @patch("api.demo_requests.get_pool")
    def test_demo_requests_under_limit(self, mock_get_pool):
        # Mock database connection pool and query
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"request_id": "test-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(DEMO_MAX):
                response = client.post("/v1/demo-requests", json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "company_name": "Acme Corp",
                    "website": "acme.com"
                })
                assert response.status_code == 201

    @patch("api.demo_requests.get_pool")
    def test_demo_requests_exceed_limit(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"request_id": "test-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(DEMO_MAX):
                response = client.post("/v1/demo-requests", json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "company_name": "Acme Corp",
                    "website": "acme.com"
                })
                assert response.status_code == 201

            # 9th request should be blocked
            response = client.post("/v1/demo-requests", json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "company_name": "Acme Corp",
                "website": "acme.com"
            })
            assert response.status_code == 429
            assert "Too many requests" in response.json()["detail"]

    @patch("api.demo_requests.get_pool")
    def test_demo_requests_partitioned_by_ip(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"request_id": "test-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            # Send maximum requests from IP 1.1.1.1
            for _ in range(DEMO_MAX):
                response = client.post(
                    "/v1/demo-requests",
                    headers={"x-forwarded-for": "1.1.1.1"},
                    json={
                        "first_name": "John",
                        "last_name": "Doe",
                        "email": "john@example.com",
                        "company_name": "Acme Corp",
                        "website": "acme.com"
                    }
                )
                assert response.status_code == 201

            # Next request from 1.1.1.1 is blocked
            response = client.post(
                "/v1/demo-requests",
                headers={"x-forwarded-for": "1.1.1.1"},
                json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "company_name": "Acme Corp",
                    "website": "acme.com"
                }
            )
            assert response.status_code == 429

            # But request from IP 2.2.2.2 succeeds
            response = client.post(
                "/v1/demo-requests",
                headers={"x-forwarded-for": "2.2.2.2"},
                json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "company_name": "Acme Corp",
                    "website": "acme.com"
                }
            )
            assert response.status_code == 201

    @patch("api.demo_requests.get_pool")
    def test_demo_requests_window_expiry(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"request_id": "test-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        current_time = [start_time]
        def get_time():
            return current_time[0]

        with patch("time.time", side_effect=get_time):
            # Fill up the limit
            for _ in range(DEMO_MAX):
                response = client.post("/v1/demo-requests", json={
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com",
                    "company_name": "Acme Corp",
                    "website": "acme.com"
                })
                assert response.status_code == 201

            # Next request is blocked
            response = client.post("/v1/demo-requests", json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "company_name": "Acme Corp",
                "website": "acme.com"
            })
            assert response.status_code == 429

            # Advance time past 1 hour
            current_time[0] += DEMO_WINDOW + 1

            # Request succeeds again
            response = client.post("/v1/demo-requests", json={
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
                "company_name": "Acme Corp",
                "website": "acme.com"
            })
            assert response.status_code == 201


# ──────────────────────────────────────────────────────────────────────────────
# Community Upload/Post Rate Limiting Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestCommunityRateLimiting:
    def setup_method(self):
        community_rate.clear()

    @patch("api.community.get_pool")
    def test_community_posts_under_limit(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"post_id": "post-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(COMM_MAX):
                response = client.post("/v1/community/posts", json={
                    "author_name": "Alice",
                    "category": "question",
                    "title": "My first question",
                    "body": "This is a detailed description of my question."
                })
                assert response.status_code == 201

    @patch("api.community.get_pool")
    def test_community_posts_exceed_limit(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"post_id": "post-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        with patch("time.time", return_value=start_time):
            for _ in range(COMM_MAX):
                response = client.post("/v1/community/posts", json={
                    "author_name": "Alice",
                    "category": "question",
                    "title": "My first question",
                    "body": "This is a detailed description of my question."
                })
                assert response.status_code == 201

            # 11th request is blocked
            response = client.post("/v1/community/posts", json={
                "author_name": "Alice",
                "category": "question",
                "title": "My first question",
                "body": "This is a detailed description of my question."
            })
            assert response.status_code == 429
            assert "Too many posts" in response.json()["detail"]

    @patch("api.community.get_pool")
    def test_community_posts_window_expiry(self, mock_get_pool):
        mock_pool = MagicMock()
        mock_pool.fetchrow = AsyncMock(return_value={"post_id": "post-uuid", "created_at": datetime.now(timezone.utc)})
        mock_get_pool.return_value = mock_pool

        start_time = 1000000.0
        current_time = [start_time]
        def get_time():
            return current_time[0]

        with patch("time.time", side_effect=get_time):
            for _ in range(COMM_MAX):
                response = client.post("/v1/community/posts", json={
                    "author_name": "Alice",
                    "category": "question",
                    "title": "My first question",
                    "body": "This is a detailed description of my question."
                })
                assert response.status_code == 201

            response = client.post("/v1/community/posts", json={
                "author_name": "Alice",
                "category": "question",
                "title": "My first question",
                "body": "This is a detailed description of my question."
            })
            assert response.status_code == 429

            # Advance past window
            current_time[0] += COMM_WINDOW + 1

            response = client.post("/v1/community/posts", json={
                "author_name": "Alice",
                "category": "question",
                "title": "My first question",
                "body": "This is a detailed description of my question."
            })
            assert response.status_code == 201
