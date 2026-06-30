# ZizkaDB Wiki

**The operational database for AI agents** — causal lineage, semantic search, time travel, and fleet dashboards.

| Resource         | Link                                                     |
| ---------------- | -------------------------------------------------------- |
| Live product     | [db.zizka.ai](https://db.zizka.ai)                       |
| Interactive docs | [db.zizka.ai/docs](https://db.zizka.ai/docs)             |
| API explorer     | [db.zizka.ai/swagger](https://db.zizka.ai/swagger)       |
| GitHub           | [Zizka-ai/ZizkaDB](https://github.com/Zizka-ai/ZizkaDB)  |
| PyPI SDK         | [zizkadb-sdk](https://pypi.org/project/zizkadb-sdk/)     |
| PyPI MCP         | [zizkadb-mcp](https://pypi.org/project/zizkadb-mcp/)     |
| npm SDK          | [zizkadb-sdk](https://www.npmjs.com/package/zizkadb-sdk) |

---

## What is ZizkaDB?

ZizkaDB stores **every agent decision as an event** with optional `parent_id` links, so you can:

| Need                             | Primitive                       |
| -------------------------------- | ------------------------------- |
| Why did the agent do that?       | `why(event_id)`                 |
| What did it know at 2pm Tuesday? | `at(agent, timestamp)`          |
| Find similar past failures       | `search()` / `context_for()`    |
| Is this agent drifting?          | Behavioral baseline + dashboard |

It is **not** just a vector DB. It is **operational memory** for production agents.

---

## Quick start (managed cloud)

1. [Sign up](https://db.zizka.ai/signup) at db.zizka.ai
2. **Dashboard → Create agent** (e.g. `my-bot`) — copy the API key shown once
3. Install SDK: `pip install zizkadb-sdk`
4. Log with the **same agent name**:

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    async with ZizkaDB("zizkadb_live_...") as db:
        await db.log(
            agent="my-bot",  # must match dashboard agent name
            event="user_message",
            data={"text": "hello"},
        )

asyncio.run(main())
```

5. Open [dashboard](https://db.zizka.ai/dashboard) — events appear within seconds

---

## Wiki pages

- [[Getting Started]] — signup, first agent, first event
- [[Agents and API Keys]] — per-agent vs tenant-wide keys (**read this**)
- [[Python SDK]]
- [[TypeScript SDK]]
- [[MCP and Cursor]]
- [[REST API]]
- [[Multi-Agent Apps]] — one app, many agent names (e.g. zizka.ai)
- [[Self-Hosting]]
- [[Production Deployment]] — db.zizka.ai on EC2
- [[Troubleshooting]]
- [[Architecture]]

---

## Packages

| Package        | Install                                        | Use                           |
| -------------- | ---------------------------------------------- | ----------------------------- |
| Python SDK     | `pip install zizkadb-sdk`                      | `from zizkadb import ZizkaDB` |
| MCP server     | `pip install zizkadb-mcp` or `uvx zizkadb-mcp` | Cursor, Claude Desktop        |
| TypeScript SDK | `npm install zizkadb-sdk`                      | Node / Next.js apps           |

Legacy env alias: `AGENTDB_API_KEY` (same as `ZIZKADB_API_KEY`).
Legacy key prefix: `agdb_live_...` still works on managed cloud.

---

## License

- API, dashboard, SDKs: **AGPL-3.0**
- MCP server: **MIT**
