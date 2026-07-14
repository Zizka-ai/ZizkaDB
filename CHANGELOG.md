# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added

- OSS-first GitHub README — `curl` quickstart with no repo clone, `why()` demo first
- `scripts/quickstart-remote.sh` — downloads compose to `~/.zizkadb`, pulls GHCR images
- `scripts/quickstart.sh` — one-command stack + lineage demo from a clone
- [CONNECT.md](CONNECT.md) — copy-paste connect guide for Python, TS, LangChain, CrewAI, MCP, REST
- [worked/01-support-order-delay/](worked/01-support-order-delay/) — readable support-bot demo
- `zizkadb demo` CLI — same story as the quickstart
- Pre-built Docker images published to `ghcr.io/zizka-ai/` on version tags
- GitHub issue templates for solo-dev bug reports

### Changed

- Wiki and docs aligned to OSS-first (localhost before managed cloud)
- `setup-local.sh` auto-detects GHCR images, falls back to local build

---

## [0.2.5] — 2026-07-08

### Fixed

- LangChain callback causal `parent_id` links
- `why()` 404 on invalid UUID
- CrewAI `kickoff_async` quickstart examples
- TypeScript SDK 422 error parsing
- Empty agent/event validation

### Changed

- PyPI `zizkadb-sdk` 0.2.5, npm `zizkadb-sdk@0.2.5`
- Honest configuration docs across site and wiki

---

## [0.2.3] — 2026-06-08

- Public SDK packages on PyPI and npm
- MCP server on PyPI

---

## [0.2.1] — 2026-05-30

- Initial public release

[Unreleased]: https://github.com/Zizka-ai/ZizkaDB/compare/v0.2.5...main
[0.2.5]: https://github.com/Zizka-ai/ZizkaDB/releases/tag/v0.2.5
[0.2.3]: https://github.com/Zizka-ai/ZizkaDB/releases/tag/v0.2.3
[0.2.1]: https://github.com/Zizka-ai/ZizkaDB/releases/tag/v0.2.1
