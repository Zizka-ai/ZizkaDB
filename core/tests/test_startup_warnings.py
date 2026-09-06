"""Unit tests for production startup configuration warnings."""

import logging

from main import warn_if_production_cors_wildcard


def test_cors_wildcard_warning_logged(caplog):
    with caplog.at_level(logging.WARNING):
        warn_if_production_cors_wildcard([])
    assert "CORS_ALLOWED_ORIGINS is unset in production" in caplog.text


def test_cors_explicit_origins_no_warning(caplog):
    with caplog.at_level(logging.WARNING):
        warn_if_production_cors_wildcard(["https://db.zizka.ai"])
    assert "CORS_ALLOWED_ORIGINS" not in caplog.text
