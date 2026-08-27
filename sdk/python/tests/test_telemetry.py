"""Telemetry install ping behavior."""

from __future__ import annotations

import zizkadb.telemetry as telemetry


def test_ping_on_install_self_hosted(monkeypatch):
    telemetry._sent = False
    called: list[str] = []

    monkeypatch.setattr(telemetry, "_send", lambda mode: called.append(mode))
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="self-hosted")
    assert called == ["self-hosted"]


def test_ping_on_install_cloud(monkeypatch):
    telemetry._sent = False
    called: list[str] = []

    monkeypatch.setattr(telemetry, "_send", lambda mode: called.append(mode))
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="cloud")
    assert called == ["cloud"]


def test_ping_respects_opt_out(monkeypatch):
    telemetry._sent = False
    called: list[str] = []

    monkeypatch.setattr(telemetry, "_send", lambda mode: called.append(mode))
    monkeypatch.setenv("ZIZKADB_TELEMETRY", "false")

    telemetry.ping_on_install(mode="cloud")
    assert called == []


def test_ping_once_per_process(monkeypatch):
    telemetry._sent = False
    called: list[str] = []

    monkeypatch.setattr(telemetry, "_send", lambda mode: called.append(mode))
    monkeypatch.delenv("ZIZKADB_TELEMETRY", raising=False)

    telemetry.ping_on_install(mode="cloud")
    telemetry.ping_on_install(mode="cloud")
    assert called == ["cloud"]
