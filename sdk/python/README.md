# zizkadb-sdk

Python SDK for [ZizkaDB](https://github.com/Zizka-ai/ZizkaDB) — audit trails, causal lineage, and drift baselines for AI agents.

**PyPI:** [zizkadb-sdk 0.2.6](https://pypi.org/project/zizkadb-sdk/)

## Try free (local — no signup)

Start the OSS stack + demo (requires Docker):

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

Or, if the stack is already running:

```bash
pip install zizkadb-sdk
zizkadb demo
```

Dashboard: http://localhost:3001/login → **Open my dashboard →**

## Install

```bash
pip install "zizkadb-sdk>=0.2.6"
```

> Install **`zizkadb-sdk`**, not the unrelated `agentdb` package on PyPI.

## Quickstart (local)

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    async with ZizkaDB(host="http://localhost:8000") as db:
        user = await db.log(agent="my-bot", event="user_message", data={"text": "Hello"})
        tool = await db.log(agent="my-bot", event="tool_call", data={"tool": "search"}, parent_id=user.event_id)
        (await db.why(tool.event_id)).print()

asyncio.run(main())
```

No API key on localhost — the local stack uses a built-in dev key.

## Scaffold a project

```bash
zizkadb init my-agent --template basic
cd my-agent
cp .env.example .env   # ZIZKADB_HOST=http://localhost:8000
pip install -r requirements.txt
python agent.py
```

Templates: `basic`, `openai`, `langchain`, `crewai`, `mcp-cursor`.

## Managed cloud (optional)

[Sign up](https://db.zizka.ai/signup) → create an agent → use the same agent name in every `db.log()`:

```python
async with ZizkaDB(api_key="zizkadb_live_...") as db:
    await db.log(agent="my-bot", event="tool_call", data={...})
```

## CLI

| Command | Description |
|---------|-------------|
| `zizkadb demo` | Run the support-bot lineage demo |
| `zizkadb init NAME -t basic` | Scaffold from a template |
| `zizkadb why EVENT_ID` | Print causal chain as JSON |

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ZIZKADB_HOST` | Local/self-hosted API (default stack: `http://localhost:8000`) |
| `ZIZKADB_API_KEY` | Managed cloud API key |
| `ZIZKADB_AGENT` | Default agent name in templates |
| `ZIZKADB_TELEMETRY` | Set `false` to opt out |

## Links

- [GitHub README](https://github.com/Zizka-ai/ZizkaDB#readme)
- [CONNECT.md](https://github.com/Zizka-ai/ZizkaDB/blob/main/CONNECT.md)
- [Docs](https://db.zizka.ai/docs)
