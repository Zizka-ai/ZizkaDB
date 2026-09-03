# Changelog

All notable changes to this project are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Integrations

- **`zizkadb-livekit` 0.2.0** (PyPI) — LiveKit Agents voice calls → ZizkaDB Sessions + Events (transcript only, no audio stored). Depends on `zizkadb-sdk>=0.2.9` + `livekit-agents>=1.3.0`. Docs: [docs/integrations/livekit.md](docs/integrations/livekit.md), example: [examples/livekit-agent/](examples/livekit-agent/).
  - **Non-blocking writes** — events go onto a bounded background queue, so no HTTP round trip sits on the audio path
  - **Live event stream** — `attach()` captures `eot_prediction` and `user_turn_exceeded`, which never reach the session report
  - **Explicit event mapping** — ~15 LiveKit pipeline events map to distinct ZizkaDB types instead of collapsing to `livekit_event`; `agent_handoff` and `agent_config_update` chat items are no longer dropped
  - **Verbosity tiers** — `transcript` / `standard` / `verbose` via `level=` or `ZIZKADB_EVENT_LEVEL`
  - **Per-call observer registry** — `register_observer` / `pop_observer` replace the module-global observer, which let concurrent calls on one worker overwrite each other's transcripts
  - **Causal chain integrity** — writes are serialized so the background writer and `ingest_session_report()` cannot fork `parent_id` into parallel strands
  - **Connection pooling** — one keep-alive connection per call instead of one per event
  - **Lifecycle** — `flush()`, idempotent `aclose()`, and async-context-manager support


## [0.2.8] — 2026-08-27

### Install telemetry (OSS adoption)

- **Python SDK 0.2.7**, **TypeScript SDK 0.2.7 (npm)**, **MCP 0.1.6**, **langchain 0.1.3**, **crewai 0.1.3**: count **installs** at import/client/server start (including self-hosted localhost), not on first API call
- Per-package telemetry keys: `python`, `langchain`, `crewai`, `livekit`, `mcp`, `typescript`, `docker`
- **Docker quickstart**: anonymous install ping (`sdk=docker`, `mode=self-hosted`) after stack is healthy
- **`sdk_telemetry`**: composite primary key `(install_id, sdk)` so Python + MCP + Docker on one machine each count separately

## [0.2.7] — 2026-08-22

### Python SDK (`zizkadb-sdk` 0.2.7, PyPI)

- Restore telemetry ping on client construct (process start), including self-hosted localhost

### TypeScript SDK (`zizkadb-sdk` 0.2.7, npm)

- Restore telemetry ping on client construct (process start), including self-hosted localhost

### MCP (`zizkadb-mcp` 0.1.6)

- Restore telemetry ping on MCP server startup (not first tool call only)

### Integrations

- `zizkadb-langchain` **0.1.2** — requires `zizkadb-sdk>=0.2.7`
- `zizkadb-crewai` **0.1.2** — requires `zizkadb-sdk>=0.2.7`

## [0.2.6] — 2026-08-21

### Python SDK (`zizkadb-sdk` 0.2.6, PyPI)

- Telemetry pings after the first successful `log()` (usage, not import)
- Stable anonymous `install_id` per machine (`~/.zizkadb` + machine-id fallback)

### TypeScript SDK (`zizkadb-sdk` 0.2.6, npm)

- Telemetry pings after the first successful `log()` (usage, not constructor)
- Stable anonymous `install_id` per machine (`~/.zizkadb` + machine-id fallback)
- Self-hosted / local installs skip telemetry (matches Python SDK)

### MCP (`zizkadb-mcp` 0.1.5)

- Telemetry pings after the first successful tool call (not server startup)
- Stable `install_id` fallback for CI/Docker

### Integrations

- `zizkadb-langchain` **0.1.1** — requires `zizkadb-sdk>=0.2.6`
- `zizkadb-crewai` **0.1.1** — requires `zizkadb-sdk>=0.2.6`

### Documentation

- Telemetry copy updated (trust page, technical brief, READMEs)
- Examples and templates pin `zizkadb-sdk>=0.2.6`

## [0.1.0] — 2026-08-21

Production-hardening sprint merged to `main` (via stacked PRs #125–#139), including:

- CI: dashboard vitest, integration workflow
- Security: scoped-key isolation on `why()`, search, verify-otp rate limits
- Dashboard: `apiFetch` timeout, 401 handling, `lib/plans.ts`
- SDK: analytics methods (`baseline`, `token_usage`, `token_optimization`)
- MCP: analytics tools
- CLI: `why`, `baseline`, `token-usage`, `token-opt`
- Docs: always-on Cursor coding standards, KB OSS scope updates

See [GitHub releases](https://github.com/Zizka-ai/ZizkaDB/releases) for tagged artifacts.

[Unreleased]: https://github.com/Zizka-ai/ZizkaDB/compare/v0.2.7...HEAD
[0.2.7]: https://github.com/Zizka-ai/ZizkaDB/compare/v0.2.6...v0.2.7
[0.2.6]: https://github.com/Zizka-ai/ZizkaDB/compare/v0.1.0...v0.2.6
[0.1.0]: https://github.com/Zizka-ai/ZizkaDB/releases
