"""Telemetry ping behavior."""

from __future__ import annotations

import zizkadb.telemetry as telemetry


def test_ping_on_install_self_hosted(monkeypatch):
    telemetry._sent.clear()
    called: list[tuple[str, str]] = []

    monkeypatch.setattr(
        telemetry,
        "_send",
        lambda mode, sdk, sdk_version: called.append((sdk, mode)),
    )
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="self-hosted", sdk="python")
    assert called == [("python", "self-hosted")]


def test_ping_on_install_cloud(monkeypatch):
    telemetry._sent.clear()
    called: list[tuple[str, str]] = []

    monkeypatch.setattr(
        telemetry,
        "_send",
        lambda mode, sdk, sdk_version: called.append((sdk, mode)),
    )
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="cloud", sdk="langchain")
    assert called == [("langchain", "cloud")]


def test_ping_respects_opt_out(monkeypatch):
    telemetry._sent.clear()
    called: list[tuple[str, str]] = []

    monkeypatch.setattr(
        telemetry,
        "_send",
        lambda mode, sdk, sdk_version: called.append((sdk, mode)),
    )
    monkeypatch.setenv("ZIZKADB_TELEMETRY", "false")

    telemetry.ping_on_install(mode="cloud", sdk="crewai")
    assert called == []


def test_ping_once_per_sdk_per_process(monkeypatch):
    telemetry._sent.clear()
    called: list[str] = []

    monkeypatch.setattr(
        telemetry,
        "_send",
        lambda mode, sdk, sdk_version: called.append(sdk),
    )
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="cloud", sdk="python")
    telemetry.ping_on_install(mode="cloud", sdk="python")
    telemetry.ping_on_install(mode="cloud", sdk="mcp")
    assert called == ["python", "mcp"]
