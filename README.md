<div align="center">

# ZizkaDB

**Know why your agent did what it did.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Zizka-ai/ZizkaDB?label=release)](https://github.com/Zizka-ai/ZizkaDB/releases)
[![Python](https://img.shields.io/pypi/v/zizkadb-sdk?label=Python)](https://pypi.org/project/zizkadb-sdk/)
[![npm](https://img.shields.io/npm/v/zizkadb-sdk?label=npm)](https://www.npmjs.com/package/zizkadb-sdk)
[![MCP](https://img.shields.io/pypi/v/zizkadb-mcp?label=MCP)](https://pypi.org/project/zizkadb-mcp/)

[Get started](#get-started) · [SDKs](#sdks) · [Docs](https://db.zizka.ai/docs) · [Community](https://db.zizka.ai/community)

</div>

<p align="center">
  <img src="docs/assets/why-demo.gif" alt="ZizkaDB showing why an AI agent made a decision" width="100%"/>
</p>

ZizkaDB is a database built specifically for AI agents. It gives you:

- **Causal lineage** — trace every decision your agent made and understand exactly why it happened (`db.why()`)
- **Time-travel state** — go back to any moment and see exactly what your agent knew (`db.at()`)
- **Memory injection** — give your agent relevant past context in a single call (`db.context_for()`)
- **Semantic search** — search your agent's entire history in plain English (`db.search()`)

No more guessing. No more digging through logs.

<p align="center">
  <img src="docs/assets/gallery-why.png" alt="Causal chain view in the ZizkaDB dashboard" width="32%"/>
  <img src="docs/assets/gallery-dashboard.png" alt="Agent fleet dashboard" width="32%"/>
  <img src="docs/assets/gallery-mcp.png" alt="ZizkaDB MCP tools inside Cursor" width="32%"/>
</p>
<p align="center">
  <sub>Causal chain view &nbsp;·&nbsp; Agent fleet dashboard &nbsp;·&nbsp; MCP tools inside Cursor</sub>
</p>

---

## Who uses ZizkaDB?

| | |
|---|---|
| **AI / ML engineers** | Causal lineage, time-travel debugging, and semantic search — built for agents in production |
| **Indie hackers & vibe-coders** | Two lines of code add full observability to any agent. No setup required on Zizka Cloud. |
| **LangChain / CrewAI users** | Native adapters — pass a callback handler and every step is logged automatically |
| **Enterprise & teams** | Self-hostable, open source (AGPL-3.0), GDPR-ready, audit logs, fleet dashboard |
| **Investors & evaluators** | [Live demo →](https://db.zizka.ai) · [Docs →](https://db.zizka.ai/docs) · [Architecture →](https://github.com/Zizka-ai/ZizkaDB/wiki/Architecture) |  

---

## Get started

Choose how you want to run ZizkaDB:

| | Zizka Cloud | Run Locally |
|---|---|---|
| **Setup** | Sign up, get an API key | Docker on your machine |
| **Best for** | Getting started fast, no setup | Full control, offline use |
| **Cost** | Free to start | Free, always |
| **Start** | [Sign up →](https://db.zizka.ai/signup) | See below |

**Run locally (no sign-up needed):**

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

> Downloads ~4 config files and pulls pre-built Docker images. No code is cloned.
> Once running: open **http://localhost:3001/login** → click **Open my dashboard**.

<details>
<summary>Other install options</summary>

**Already have the repo cloned?**
```bash
bash scripts/quickstart.sh
```

**No Docker?** → [Self-hosting guide](https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting)

</details>

---

## SDKs

**Pick your language and install:**

| Language / Framework | Install |
|---|---|
| **Python** | `pip install zizkadb-sdk` |
| **TypeScript / JavaScript** | `npm install zizkadb-sdk` |
| **LangChain** | `pip install zizkadb-sdk "zizkadb-langchain @ git+https://github.com/Zizka-ai/ZizkaDB.git@main#subdirectory=integrations/langchain"` |
| **CrewAI** | `pip install zizkadb-sdk "zizkadb-crewai @ git+https://github.com/Zizka-ai/ZizkaDB.git@main#subdirectory=integrations/crewai"` |
| **AI Editor (Cursor, Claude)** | `uvx zizkadb-mcp` |
| **REST (any language)** | No install needed — use any HTTP client |

---

### Python

```bash
pip install zizkadb-sdk
```

**Minimal working example (Python):**

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    # Use api_key for Zizka Cloud, or host for local
    async with ZizkaDB(api_key="zizkadb_live_...") as db:
    # async with ZizkaDB(host="http://localhost:8000") as db:   ← local

        # Log three linked events
        user = await db.log(agent="my-bot", event="user_message", data={"text": "Why is my order delayed?"})
        llm  = await db.log(agent="my-bot", event="llm_response", data={"model": "gpt-4o"},      parent_id=user.event_id)
        tool = await db.log(agent="my-bot", event="tool_call",    data={"tool": "lookup_order"}, parent_id=llm.event_id)

        # Ask why the tool was called — walks the causal chain backward
        chain = await db.why(tool.event_id)
        chain.print()

asyncio.run(main())
```

Expected output:

```
tool_call · lookup_order
  └── llm_response · gpt-4o
        └── user_message · Why was my order delayed?
```

> **`parent_id`** links one event to the previous one — this is how ZizkaDB builds causal lineage.
> **`session_id`** groups events into a single run (useful for `db.baseline()` and `db.memory_diff()`).

→ [Full Python guide](CONNECT.md#python-sdk) · `zizkadb init my-agent --template basic`

---

### TypeScript / JavaScript

```bash
npm install zizkadb-sdk
```

**Minimal working example (TypeScript / JavaScript):**

```typescript
import { ZizkaDB } from 'zizkadb-sdk'

const db = new ZizkaDB({ apiKey: 'zizkadb_live_...' })
// const db = new ZizkaDB({ host: 'http://localhost:8000' })   ← local

const user = await db.log({ agent: 'my-bot', event: 'user_message', data: { text: 'Hello' } })
const tool = await db.log({ agent: 'my-bot', event: 'tool_call', data: { tool: 'search' }, parentId: user.eventId })

const chain = await db.why(tool.eventId)
console.log(chain)
```

> TypeScript uses camelCase: `parentId`, `eventId`. LangChain and CrewAI adapters are Python-only.

→ [Full TypeScript guide](CONNECT.md#typescript-sdk)

---

### LangChain

```bash
pip install zizkadb-sdk zizkadb-langchain
```

**Minimal working example (LangChain):**

```python
from zizkadb import ZizkaDB
from zizkadb_langchain import ZizkaDBCallbackHandler

async with ZizkaDB(api_key="zizkadb_live_...") as db:
    handler = ZizkaDBCallbackHandler(db, agent="my-bot")

    # Pass the handler to any LangChain chain — events are logged automatically
    result = await chain.ainvoke({"input": "..."}, config={"callbacks": [handler]})

    # Trace why the agent made its final decision
    await db.why(handler.last_event_id).print()
```

→ [Full LangChain guide](CONNECT.md#langchain) · `zizkadb init my-agent --template langchain`

---

### CrewAI

```bash
pip install zizkadb-sdk zizkadb-crewai
```

**Minimal working example (CrewAI):**

```python
from zizkadb import ZizkaDB
from zizkadb_crewai import ZizkaDBCrewLogger

async with ZizkaDB(api_key="zizkadb_live_...") as db:
    logger = ZizkaDBCrewLogger(db, agent="research-crew")

    kickoff = await logger.log_kickoff(goal="Research AI trends")
    result = crew.kickoff()
    await logger.log_output(str(result), parent_id=kickoff.event_id)
```

→ [Full CrewAI guide](CONNECT.md#crewai) · `zizkadb init my-agent --template crewai`

---

### AI Editor (Cursor, Claude Desktop, Windsurf)

```bash
uvx zizkadb-mcp
```

**Minimal working example (MCP config):**

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

Add this to `~/.cursor/mcp.json` (or your editor's MCP config file). Your AI editor can now call ZizkaDB tools directly from chat.

→ [Full MCP guide](mcp/README.md) · `zizkadb init my-agent --template mcp-cursor`

---

### REST — any language

**Minimal working example (REST):**

```bash
curl -X POST http://localhost:8000/v1/events \
  -H "Authorization: Bearer zizkadb_dev_local" \
  -H "Content-Type: application/json" \
  -d '{"agent":"my-bot","event":"user_message","data":{"text":"Hello"}}'
```

Expected response:

```json
{ "event_id": "b3a1c...", "timestamp": "2026-07-15T10:00:00Z", "sequence_no": 1 }
```

→ [Swagger / API explorer](http://localhost:8000/swagger) · [Docs](https://db.zizka.ai/docs)

---

## What you can do

| Function | What it does | When to use it |
|---|---|---|
| `db.log()` | Save any agent action as a structured event | Track every step your agent takes |
| `db.why()` | Trace back every decision that led to an event | Root cause analysis |
| `db.search()` | Search your agent's history in plain English | Find similar past failures |
| `db.at()` | See what your agent knew at a specific point in time | Time-travel debugging |
| `db.context_for()` | Get relevant past events formatted as a prompt block | Inject memory into your system prompt |
| `db.memory_diff()` | Compare one session to previous sessions | Spot unexpected behavior changes |
| `db.baseline()` | Check if your agent is behaving consistently over time | Detect drift |
| `db.query()` | Fetch raw events with filters (type, session, time range) | Build dashboards or audit logs |
| `db.forget()` | Delete all events matching a specific value | GDPR / delete a user's data |
| `db.agents()` | List all agents in your project | Manage multiple agents |

> `db.log()`, `db.why()`, and `db.at()` work without an OpenAI key.
> `db.search()` and `db.context_for()` require `OPENAI_API_KEY` for embeddings.

---

## Common workflows

| I want to… | Start here |
|---|---|
| Add observability to my agent | `db.log(agent, event, data)` with `parent_id` on each step |
| Understand why my agent did something | `db.why(event_id)` |
| Search past behavior in plain English | `db.search("describe what you're looking for")` |
| Give my agent memory of past runs | `db.context_for(agent, task)` |
| See what my agent knew at a specific time | `db.at(agent, timestamp)` |
| Check if my agent is behaving differently than before | `db.baseline(agent)` |
| Delete a specific user's data | `db.forget("user_id", "usr_123")` |
| Use ZizkaDB directly in Cursor or Claude | [AI Editor setup](#ai-editor-cursor-claude-desktop-windsurf) |
| Start a new project from a template | `zizkadb init my-agent --template basic` |

---

## Environment variables

| Variable | What it does | Example |
|---|---|---|
| `ZIZKADB_API_KEY` | Your Zizka Cloud API key | `zizkadb_live_...` |
| `ZIZKADB_HOST` | URL of your local or self-hosted ZizkaDB | `http://localhost:8000` |
| `ZIZKADB_AGENT` | Default agent name (used in templates) | `my-bot` |
| `OPENAI_API_KEY` | Required for `db.search()` and `db.context_for()` | `sk-...` |
| `ZIZKADB_TELEMETRY` | Set to `false` to turn off anonymous usage data | `false` |

> **Local dev tip:** When connecting to `localhost:8000`, no API key is needed — the local stack uses a built-in dev key automatically.

---

## More resources

| Resource | Link |
|---|---|
| Full connect guide (all SDKs) | [CONNECT.md](CONNECT.md) |
| Docs site | [db.zizka.ai/docs](https://db.zizka.ai/docs) |
| Examples | [examples/](examples/) |
| Start from a template | `zizkadb init my-agent --template basic` |
| Available templates | `basic` · `openai` · `langchain` · `crewai` · `mcp-cursor` |
| Self-hosting guide | [wiki/Self-Hosting](https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting) |
| Production deployment | [wiki/Production-Deployment](https://github.com/Zizka-ai/ZizkaDB/wiki/Production-Deployment) |
| Troubleshooting | [wiki/Troubleshooting](https://github.com/Zizka-ai/ZizkaDB/wiki/Troubleshooting) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Community | [db.zizka.ai/community](https://db.zizka.ai/community) |
| Security | [SECURITY.md](SECURITY.md) |

---

## License

- API, dashboard, and SDKs: [AGPL-3.0](LICENSE)
- MCP server: [MIT](mcp/LICENSE)

> To turn off anonymous telemetry: `export ZIZKADB_TELEMETRY=false`
