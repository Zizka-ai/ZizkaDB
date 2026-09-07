"""API display version stays aligned with the SDK release line."""

from main import API_VERSION, app


def test_api_version_matches_openapi():
    assert app.version == API_VERSION


def test_health_reports_api_version():
    from fastapi.testclient import TestClient

    client = TestClient(app)
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["version"] == API_VERSION
