"""
Unit tests for the centralized exception helpers in services/exceptions.py.
Focuses strictly on new behaviors: header injection, kwargs propagation, and wrapper status codes.
"""

from fastapi import status
from services.exceptions import (
    make_exception,
    bad_request,
    unauthorized,
    forbidden,
    not_found,
    conflict,
    rate_limit_exceeded,
    internal_error,
)


def test_make_exception_unauthorized_header_injection():
    # 1. 401 Unauthorized with no headers supplied -> should inject Bearer
    exc_none = make_exception(status.HTTP_401_UNAUTHORIZED, "Unauthorized Access")
    assert exc_none.headers == {"WWW-Authenticate": "Bearer"}

    # 2. 401 Unauthorized with custom headers -> should inject Bearer and keep custom headers
    exc_custom = make_exception(
        status.HTTP_401_UNAUTHORIZED,
        "Unauthorized Access",
        headers={"X-Test-Header": "value"},
    )
    assert exc_custom.headers == {"X-Test-Header": "value", "WWW-Authenticate": "Bearer"}

    # 3. 401 Unauthorized with pre-existing WWW-Authenticate header -> should NOT overwrite it
    exc_exists = make_exception(
        status.HTTP_401_UNAUTHORIZED,
        "Unauthorized Access",
        headers={"WWW-Authenticate": "Basic realm=api"},
    )
    assert exc_exists.headers == {"WWW-Authenticate": "Basic realm=api"}

    # 4. Other status code -> should NOT inject WWW-Authenticate
    exc_other = make_exception(status.HTTP_400_BAD_REQUEST, "Bad Request")
    assert exc_other.headers == {}


def test_make_exception_kwargs_propagation():
    # Verify arbitrary kwargs are passed through to the parent HTTPException class
    # (FastAPI/Starlette HTTPException accepts standard fields, other parameters should not crash it)
    exc = make_exception(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Server Error",
        custom_param="arbitrary-value",
    )
    assert exc.status_code == 500
    assert exc.detail == "Server Error"
    assert getattr(exc, "custom_param") == "arbitrary-value"


def test_semantic_wrappers_status_codes():
    # Check that status codes and standard details are correctly mapped by the wrappers
    assert bad_request("Error").status_code == status.HTTP_400_BAD_REQUEST
    assert unauthorized("Error").status_code == status.HTTP_401_UNAUTHORIZED
    assert forbidden("Error").status_code == status.HTTP_403_FORBIDDEN
    assert not_found("Error").status_code == status.HTTP_404_NOT_FOUND
    assert conflict("Error").status_code == status.HTTP_409_CONFLICT
    assert rate_limit_exceeded("Error").status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert internal_error("Error").status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
