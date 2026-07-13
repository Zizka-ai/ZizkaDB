# zizkadb-sdk

Python SDK for [ZizkaDB](https://db.zizka.ai) — the operational database for AI agents.

## Setup (managed cloud)

1. [Sign up](https://db.zizka.ai/signup) at db.zizka.ai  
2. **Dashboard → Create agent** (e.g. `my-bot`) — you get an API key for that agent  
3. Use the **same agent name** in every `db.log()` call  
4. Set `ZIZKADB_API_KEY` (or pass the key to the constructor)

> **Important:** The `agent` in `db.log(agent="...", ...)` must match the agent you created in the dashboard. A mismatch returns **403 AgentScopeError**.

## Install

```bash
pip install zizkadb-sdk
```

> **Note:** There is an unrelated package called `agentdb` on PyPI. Install **`zizkadb-sdk`**. Import: `from zizkadb import ZizkaDB`.

## Scaffold a project

```bash
pip install zizkadb-sdk
zizkadb init my-agent --template basic
cd my-agent && cp .env.example .env   # paste your key into ZIZKADB_API_KEY
pip install -r requirements.txt
python agent.py
```

Templates: `basic`, `openai`, `langchain`, `crewai`, `mcp-cursor`.

## Quickstart

```python
from zizkadb import ZizkaDB

# Key from Dashboard → Agents → create "my-bot" → copy key
db = ZizkaDB("zizkadb_live_xxxx")

async with db:
    result = await db.log(
        agent="my-bot",  # must match dashboard agent name
        event="tool_call",
        data={"tool": "search", "query": "billing"},
    )
    chain = await db.why(result.event_id)
    chain.print()
```

## Multi-agent apps (one key, many agent names)

If your app logs to **different agent ids** per user (e.g. `conv-alice`, `conv-bob`), create a **tenant-wide key** in **Settings → Tenant-wide API key**. Per-agent keys only work for that one agent name.

## Errors

| Exception | Meaning |
|-----------|---------|
| `AuthError` | Invalid or revoked API key |
| `AgentScopeError` | Key is for agent A but you logged to agent B |
| `NotFoundError` | Event or agent not found |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ZIZKADB_API_KEY` | Your cloud API key (preferred) |
| `AGENTDB_API_KEY` | Legacy alias for `ZIZKADB_API_KEY` |
| `ZIZKADB_AGENT` | Default agent name (used in templates/examples) |
| `ZIZKADB_HOST` | Self-hosted API URL |
| `ZIZKADB_TELEMETRY` | Set `false` to opt out |

## Self-host dashboard

1. `bash scripts/setup-local.sh` (API + dashboard on port **3001**)
2. Open http://localhost:3001/login → **Open my dashboard →**

## Links

- [Docs](https://db.zizka.ai/docs)
- [API explorer](https://db.zizka.ai/swagger)
- [GitHub](https://github.com/Zizka-ai/ZizkaDB)
