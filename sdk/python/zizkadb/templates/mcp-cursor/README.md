# MCP + Cursor starter

No Python agent loop — ZizkaDB runs as MCP tools inside Cursor.

**Prerequisite:** install [uv](https://docs.astral.sh/uv/) so `uvx` is available.

## Managed cloud

```bash
cp mcp.json ~/.cursor/mcp.json
```

Replace `zizkadb_live_xxxx` with your key from db.zizka.ai.

## Self-hosted

```bash
cp mcp.local.json ~/.cursor/mcp.json
```

Requires `bash scripts/setup-local.sh` running first.

Quit Cursor (`Cmd+Q`) and reopen. Try: _"Log that we chose Postgres for the agent store"_.

Tools: `log_event`, `why`, `search_memory`, `get_context`, `time_travel`, `memory_diff`, `forget`.
