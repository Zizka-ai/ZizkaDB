# MCP + Cursor starter

No Python agent loop — ZizkaDB runs as MCP tools inside Cursor.

**Prerequisite:** install [uv](https://docs.astral.sh/uv/) so `uvx` is available:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

## Managed cloud (db.zizka.ai)

1. [Sign up](https://db.zizka.ai/signup) → Dashboard → Create agent → copy `zizkadb_live_...` key
2. Copy config:

```bash
cp mcp.json ~/.cursor/mcp.json
# Or merge the "zizkadb" block into your existing mcp.json
```

3. Replace `zizkadb_live_xxxx` with your key
4. Quit Cursor (`Cmd+Q`) and reopen

## Self-hosted (localhost)

1. Start ZizkaDB: `bash scripts/setup-local.sh` from repo root
2. Copy local config:

```bash
cp mcp.local.json ~/.cursor/mcp.json
```

3. Quit Cursor (`Cmd+Q`) and reopen — dev key auto-injected on localhost

Reload MCP in Cursor, then try: _"Log that we chose Postgres for the agent store"_.

Tools: `log_event`, `why`, `search_memory`, `get_context`, `time_travel`, `memory_diff`, `forget`.
