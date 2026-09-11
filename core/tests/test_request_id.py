"""Request-ID middleware — header propagation and logging."""

from unittest.mock import patch

from fastapi.testclient import TestClient

from middleware.request_id import REQUEST_ID_HEADER
from main import app

client = TestClient(app)


def test_response_includes_generated_request_id():
    response = client.get("/health")
    assert response.status_code == 200
    request_id = response.headers.get(REQUEST_ID_HEADER)
    assert request_id
    assert len(request_id) >= 8


def test_client_request_id_is_echoed():
    request_id = "11111111-1111-1111-1111-111111111111"
    response = client.get("/health", headers={REQUEST_ID_HEADER: request_id})
    assert response.status_code == 200
    assert response.headers[REQUEST_ID_HEADER] == request_id


@patch("middleware.request_id.log")
def test_request_start_and_end_logged(mock_log):
    request_id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    client.get("/health", headers={REQUEST_ID_HEADER: request_id})

    assert mock_log.info.call_count == 2
    start_msg = mock_log.info.call_args_list[0].args
    end_msg = mock_log.info.call_args_list[1].args
    assert start_msg[0] == "[%s] %s %s"
    assert start_msg[1] == request_id
    assert start_msg[2] == "GET"
    assert start_msg[3] == "/health"
    assert end_msg[1] == request_id
    assert end_msg[4] == 200
