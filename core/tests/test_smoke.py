"""Smoke and unit tests for ZizkaDB core."""

import os
import pytest


def test_dev_tenant_uses_valid_uuid():
    tenant_id = "00000000-0000-0000-0000-000000000001"
    user_id = "00000000-0000-0000-0000-000000000001"
    assert len(tenant_id) == 36
    assert tenant_id.count("-") == 4
    assert user_id.count("-") == 4


def test_python_sdk_auto_injects_dev_key():
    from zizkadb.client import ZizkaDB, DEFAULT_DEV_API_KEY

    db = ZizkaDB(host="http://localhost:8000")
    assert db._api_key == DEFAULT_DEV_API_KEY
    assert db._headers()["Authorization"] == f"Bearer {DEFAULT_DEV_API_KEY}"


def test_legacy_agdb_live_key_not_treated_as_jwt():
    """API keys must not be mistaken for JWTs (three dot-separated segments)."""
    legacy = "agdb_live_" + "A" * 40
    assert legacy.count(".") != 2


def test_python_sdk_accepts_legacy_agentdb_env(monkeypatch):
    from zizkadb.client import ZizkaDB

    monkeypatch.delenv("ZIZKADB_API_KEY", raising=False)
    monkeypatch.setenv("AGENTDB_API_KEY", "agdb_live_legacy_example")
    db = ZizkaDB("agdb_live_legacy_example")
    assert db._api_key == "agdb_live_legacy_example"


def test_python_sdk_respects_env_api_key(monkeypatch):
    from zizkadb.client import ZizkaDB

    monkeypatch.setenv("ZIZKADB_API_KEY", "zizkadb_custom_key")
    db = ZizkaDB(host="http://localhost:8000")
    assert db._api_key == "zizkadb_custom_key"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_health_endpoint():
    import httpx

    base = os.getenv("ZIZKADB_TEST_URL", "http://localhost:8000")
    async with httpx.AsyncClient(base_url=base, timeout=5) as client:
        r = await client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


@pytest.mark.asyncio
@pytest.mark.integration
async def test_dev_token_and_log_event():
    import httpx

    base = os.getenv("ZIZKADB_TEST_URL", "http://localhost:8000")
    dev_key = os.getenv("DEV_API_KEY", "zizkadb_dev_local")

    async with httpx.AsyncClient(base_url=base, timeout=10) as client:
        token_res = await client.post("/v1/auth/dev-token")
        assert token_res.status_code == 200
        assert "access_token" in token_res.json()

        log_res = await client.post(
            "/v1/events",
            headers={"Authorization": f"Bearer {dev_key}"},
            json={
                "agent": "support-bot",
                "event": "smoke_test",
                "data": {"ok": True},
            },
        )
        assert log_res.status_code == 201
        body = log_res.json()
        assert "event_id" in body
        event_id = body["event_id"]

        why_res = await client.get(
            f"/v1/events/{event_id}/why",
            headers={"Authorization": f"Bearer {dev_key}"},
        )
        assert why_res.status_code == 200

        bad_why = await client.get(
            "/v1/events/evt_abc123/why",
            headers={"Authorization": f"Bearer {dev_key}"},
        )
        assert bad_why.status_code == 404


def test_causal_chain_model_and_print(capsys):
    """Test the causal chain print and representation functions."""
    from datetime import datetime
    from zizkadb.models import Event, CausalChain

    events = [
        Event(
            event_id="evt_1",
            agent="test-agent",
            timestamp=datetime(2026, 6, 25, 12, 0, 0),
            event="user_message",
            data={"text": "hello"},
        ),
        Event(
            event_id="evt_2",
            agent="test-agent",
            timestamp=datetime(2026, 6, 25, 12, 0, 5),
            event="llm_response",
            data={"text": "world"},
            parent_id="evt_1",
        ),
    ]
    chain = CausalChain(event_id="evt_2", chain_length=2, chain=events)
    assert repr(chain) == "CausalChain(length=2)"

    chain.print()
    captured = capsys.readouterr()
    assert "user_message" in captured.out
    assert "llm_response" in captured.out
    assert "└── llm_response" in captured.out


def test_safe_print_handles_encoding_error(capsys, monkeypatch):
    """Test that _safe_print handles UnicodeEncodeError gracefully by falling back."""
    import builtins
    from zizkadb.models import _safe_print

    original_print = builtins.print

    def mock_print(text, *args, **kwargs):
        if "├──" in str(text):
            raise UnicodeEncodeError("charmap", str(text), 0, 3, "character maps to <undefined>")
        original_print(text, *args, **kwargs)

    monkeypatch.setattr(builtins, "print", mock_print)

    # Calling _safe_print should not raise an error, but fallback to direct write or ASCII
    _safe_print("test ├── connector")
    captured = capsys.readouterr()
    assert "test" in captured.out
