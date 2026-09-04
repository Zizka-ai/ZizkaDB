<div align="center">

# ZizkaDB

**When your agent misbehaves, see why.**

Self-hosted audit trail for AI agents — one command or one dashboard click from any step back to root cause.

[![CI](https://github.com/Zizka-ai/ZizkaDB/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Zizka-ai/ZizkaDB/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/badge/release-v0.2.8-f97316)](https://github.com/Zizka-ai/ZizkaDB/releases)
[![Python SDK](https://img.shields.io/pypi/v/zizkadb-sdk?label=Python%20SDK)](https://pypi.org/project/zizkadb-sdk/)
[![LangChain](https://img.shields.io/pypi/v/zizkadb-langchain?label=LangChain)](https://pypi.org/project/zizkadb-langchain/)
[![CrewAI](https://img.shields.io/pypi/v/zizkadb-crewai?label=CrewAI)](https://pypi.org/project/zizkadb-crewai/)
[![LiveKit](https://img.shields.io/pypi/v/zizkadb-livekit?label=LiveKit)](https://pypi.org/project/zizkadb-livekit/)
[![MCP](https://img.shields.io/pypi/v/zizkadb-mcp?label=MCP)](https://pypi.org/project/zizkadb-mcp/)

**[Try it ↓](#try-it-60-seconds)** · **[START_HERE.md](START_HERE.md)** · **[CONNECT.md](CONNECT.md)** · **[Cloud →](https://db.zizka.ai/signup)**

</div>

<p align="center">
  <img src="docs/assets/readme-hero-causal-graph.png" alt="Why feature — pick any agent step and walk back to root cause with db.why()" width="100%"/>
</p>

<a id="try-it-60-seconds"></a>

## Try it (60 seconds)

Requires [Docker](https://docs.docker.com/get-docker/). First image pull may take 5–10 minutes.

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

You should see:

```text
tool_call · lookup_order · ORD-8842
  └── llm_response · gpt-4o
        └── user_message · Why was my order delayed?
```

Run again anytime: `pip install zizkadb-sdk && zizkadb demo`

---

## Why?

Every agent team asks: *Why did it say that? Why did it call that tool?*

1. **Log** agent steps with `parent_id` (each step links to the one that caused it).
2. **Ask why** — terminal: `zizkadb why <event_id>` or Python: `(await db.why(event_id)).print()`
3. **See the chain** — walk back to the user message, wrong tool, or bad context.

**Dashboard (same chain):** [Activity → support-bot](http://localhost:3001/dashboard/activity?agent=support-bot) → click an event → **Why? (causal)** tab.

<p align="center">
  <img src="docs/assets/gallery-why.png" alt="db.why() output — tool_call to llm_response to user_message" width="640"/>
</p>

---

## Connect (3 lines)

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    async with ZizkaDB(host="http://localhost:8000") as db:
        user = await db.log(agent="my-bot", event="user_message", data={"text": "Why is my order late?"})
        tool = await db.log(agent="my-bot", event="tool_call", data={"tool": "lookup_order"}, parent_id=user.event_id)
        (await db.why(tool.event_id)).print()

asyncio.run(main())
```

Full guides: **[CONNECT.md](CONNECT.md)** · [LangChain](CONNECT.md#langchain) · [CrewAI](CONNECT.md#crewai) · [LiveKit (voice)](CONNECT.md#livekit-agents-voice) · [MCP / Cursor](mcp/README.md)

---

## Integrations

| Python | TypeScript | LangChain | CrewAI | LiveKit | MCP | REST |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| [`zizkadb-sdk`](https://pypi.org/project/zizkadb-sdk/) | [`zizkadb-sdk`](https://www.npmjs.com/package/zizkadb-sdk) | [`zizkadb-langchain`](https://pypi.org/project/zizkadb-langchain/) | [`zizkadb-crewai`](https://pypi.org/project/zizkadb-crewai/) | [`zizkadb-livekit`](https://pypi.org/project/zizkadb-livekit/) | `uvx zizkadb-mcp` | [Swagger](https://db.zizka.ai/swagger) |

Scaffold a project: `zizkadb init my-agent --template basic`

### Voice agents (LiveKit)

```bash
pip install zizkadb-livekit
```

One LiveKit call → one **Session** in Activity (transcript only, no audio in ZizkaDB). Full guide: [CONNECT.md → LiveKit](CONNECT.md#livekit-agents-voice) · [docs/integrations/livekit.md](docs/integrations/livekit.md) · [example](examples/livekit-agent/).

---

<details>
<summary><strong>Managed cloud (Pro / Team) — optional</strong></summary>

Same **Why?** feature — hosted at [db.zizka.ai](https://db.zizka.ai). No Docker to maintain.

| | **Pro** | **Team** |
| --- | --- | --- |
| Price | €29 / mo | €69 / mo |
| Events / mo† | 50k | 100k |
| API keys | 2 | 5 |

[Sign up →](https://db.zizka.ai/signup/plan) · [Enterprise VPC →](https://db.zizka.ai/enterprise)

† Plan targets on managed cloud; not enforced in API yet. See [docs/README.md](docs/README.md#plan-limits-honest).

</details>

<details>
<summary><strong>More features — drift, time-travel, search, GDPR</strong></summary>

| Function | What it does |
| --- | --- |
| `db.baseline()` | Detect when agent behavior drifts vs past sessions |
| `db.at()` | Reconstruct what the agent knew at a timestamp |
| `db.search()` | Semantic search over agent history |
| `db.context_for()` | Inject relevant past events into prompts |
| `db.forget()` | GDPR erasure by metadata filter |

</details>

<details>
<summary><strong>FAQ</strong></summary>

**Do I need to clone this repo?**  
No — the curl quickstart downloads config + Docker images only.

**Do I need an API key locally?**  
No — `http://localhost:8000` uses a built-in dev key. Dashboard: [localhost:3001/login](http://localhost:3001/login).

**How is this different from Langfuse / LangSmith?**  
They **observe** span trees. ZizkaDB **audits** with explicit `parent_id` chains and `db.why()` on your Postgres — self-host under AGPL, no trace billing.

**Voice agents with LiveKit?**  
Install **`zizkadb-livekit`** — one pip command, connect to Docker with `ZIZKADB_HOST=http://localhost:8000`. See [LiveKit guide](CONNECT.md#livekit-agents-voice).

**`zizkadb demo` connection refused?**  
Start the stack: `curl -fsSL …/quickstart-remote.sh | bash` or `bash scripts/setup-local.sh`.

</details>

<details>
<summary><strong>Docs & community</strong></summary>

| | |
| --- | --- |
| Worked example | [worked/01-support-order-delay](worked/01-support-order-delay/) |
| Examples | [examples/](examples/) — includes [LiveKit voice agent](examples/livekit-agent/) |
| LiveKit integration | [docs/integrations/livekit.md](docs/integrations/livekit.md) |
| Self-hosting | [wiki/Self-Hosting](https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting) |
| Integrate any agent | [docs/integrate/](docs/integrate/) |
| Issues · Discussions | [Issues](https://github.com/Zizka-ai/ZizkaDB/issues) · [Discussions](https://github.com/Zizka-ai/ZizkaDB/discussions) |
| Contributing · Security | [CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) |
| AI-assisted development | [AGENTS.md](AGENTS.md) · [docs/ai/](docs/ai/) |

</details>

<p align="center">
  <sub>AGPL-3.0 · MCP server MIT · Disable telemetry: <code>export ZIZKADB_TELEMETRY=false</code></sub>
</p>
