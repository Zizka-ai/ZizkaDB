# mcp/ — ZizkaDB MCP Server

See root [`CLAUDE.md`](../CLAUDE.md) for full project context.

Package: **`zizkadb-mcp`** on PyPI. License: **MIT** (not AGPL — this is the only module with a different license).

---

## Run

```bash
uvx zizkadb-mcp
```

Or install permanently:
```bash
pip install zizkadb-mcp
zizkadb-mcp
```

---

## Configuration

Set via environment variables (or MCP server `env` block):

| Variable | Purpose | Default |
|---|---|---|
| `ZIZKADB_HOST` | Backend URL | `https://db.zizka.ai` |
| `ZIZKADB_API_KEY` | API key (required on cloud) | — |
| `AGENTDB_API_KEY` | Legacy alias | — |
| `ZIZKADB_TELEMETRY` | Set `false` to opt out | `true` |

**On localhost** (`ZIZKADB_HOST=http://localhost:8000`), the dev key `zizkadb_dev_local` is auto-injected — no `ZIZKADB_API_KEY` needed.

---

## MCP tools (defined in `zizkadb_mcp/server.py`)

The server exposes 11 tools over stdio transport:

| Tool | SDK equivalent |
|---|---|
| `log_event` | `db.log()` |
| `search_memory` | `db.search()` |
| `get_context` | `db.context_for()` |
| `why` | `db.why()` |
| `query_events` | `db.query()` |
| `time_travel` | `db.at()` |
| `get_baseline` | `db.baseline()` |
| `get_token_usage` | `db.token_usage()` |
| `get_token_optimization` | `db.token_optimization()` |
| `memory_diff` | `db.memory_diff()` |
| `forget` | `db.forget()` |

---

## Cursor / Claude Desktop config

Config example: `.cursor/mcp.json.example`

```json
{
  "mcpServers": {
    "zizkadb": {
      "command": "uvx",
      "args": ["zizkadb-mcp"],
      "env": {
        "ZIZKADB_API_KEY": "zizkadb_live_...",
        "ZIZKADB_HOST": "http://localhost:8000"
      }
    }
  }
}
```

---

## Tests

```bash
pytest mcp/tests/ -v
```

MCP tests are also run in CI (`ci.yml` python job).

---

## Version

Lives in `mcp/pyproject.toml`. Bump this together with `sdk/python/pyproject.toml`, `sdk/typescript/package.json`, and `core/main.py version=`. See `.cursor/skills/zizkadb-release/SKILL.md`.
