<div align="center">

# ZizkaDB

**Know why your agent did what it did.**

Operational database for AI agents — replay sessions, trace decisions, detect drift.

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](LICENSE)
[![Release](https://img.shields.io/github/v/release/Zizka-ai/ZizkaDB?label=release&color=f97316)](https://github.com/Zizka-ai/ZizkaDB/releases)
[![Python](https://img.shields.io/pypi/v/zizkadb-sdk?label=Python)](https://pypi.org/project/zizkadb-sdk/)
[![npm](https://img.shields.io/npm/v/zizkadb-sdk?label=npm)](https://www.npmjs.com/package/zizkadb-sdk)
[![MCP](https://img.shields.io/pypi/v/zizkadb-mcp?label=MCP)](https://pypi.org/project/zizkadb-mcp/)

**[Open Source ↓](#open-source-self-host)** · **[Pro ↓](#pro-managed-cloud)** · **[Team ↓](#team-managed-cloud)** · **[Docs](https://db.zizka.ai/docs)** · **[Live site](https://db.zizka.ai)**

</div>

<p align="center">
  <a href="https://db.zizka.ai/dashboard">
    <img src="docs/assets/readme-hero-dashboard.png" alt="ZizkaDB dashboard — Activity, Agent Behavior, Reports, and AI suggestions" width="100%"/>
  </a>
</p>

<p align="center">
  <sub>↑ Activity · Behavior · Reports · Suggestions — same dashboard on <a href="https://db.zizka.ai">managed cloud</a> and after <code>quickstart</code></sub>
</p>

---

## Pick your path

| | **Open Source** | **Pro** | **Team** |
| :--- | :--- | :--- | :--- |
| **Best for** | Self-hosters & contributors | Solo devs & early prod | Teams with multiple agents |
| **Price** | Free forever (AGPL) | €29 / month | €69 / month |
| **Hosting** | Your machine / VPC | [db.zizka.ai](https://db.zizka.ai) | [db.zizka.ai](https://db.zizka.ai) |
| **Events / month** | Unlimited (your infra) | 50k | 100k |
| **Projects** | Unlimited | 2 | 5 |
| **Dashboard** | Activity · Behavior · Reports · Suggestions | Same + **Fleet** (managed) | Same + **Fleet** + priority support |
| **Support** | Community | Email | Priority |
| **Jump to** | [4 steps ↓](#open-source-self-host) | [4 steps ↓](#pro-managed-cloud) | [4 steps ↓](#team-managed-cloud) |

> **Enterprise VPC?** Single-tenant deploy, commercial license → [db.zizka.ai/enterprise](https://db.zizka.ai/enterprise)

> This repo is the **open-source product runtime** (API, dashboard, SDKs, MCP). Managed operator tools live in a private repo; all product links point here.

---

## Open Source (self-host)

**Free · AGPL-3.0 · Your infrastructure**

| Step | What you get |
| :---: | :--- |
| **① What it is** | ZizkaDB stores every agent step as a **linked event** — not scattered logs. Trace decisions with **`why()`**, rewind with **`at()`**, search history in plain English, and catch **behavioral drift** before users notice. You run the full stack: API + dashboard + SDKs. |
| **② How to integrate** | Run locally in ~2 min: `curl -fsSL …/quickstart-remote.sh \| bash` then `pip install zizkadb-sdk` (or TS / MCP / REST). Link events with `parent_id` so `why()` can walk the chain. → **[Full connect guide](CONNECT.md)** |
| **③ Documentation** | [CONNECT.md](CONNECT.md) · [Docs](https://db.zizka.ai/docs) · [Self-hosting](https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting) · [Examples](examples/) · [Architecture](https://github.com/Zizka-ai/ZizkaDB/wiki/Architecture) |
| **④ Live dashboard** | **[localhost:3001/login](http://localhost:3001/login)** → **Open my dashboard** (no signup). Log from SDK → refresh → see sessions live. |

**Quickstart**

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

```python
async with ZizkaDB(host="http://localhost:8000") as db:
    user = await db.log(agent="my-bot", event="user_message", data={"text": "Why is my order late?"})
    tool = await db.log(agent="my-bot", event="tool_call", data={"tool": "lookup_order"}, parent_id=user.event_id)
    await db.why(tool.event_id).print()
```

<p align="center">
  <img src="docs/assets/why-demo.gif" alt="Terminal demo — trace why an agent called a tool with db.why()" width="640"/>
  <br/>
  <sub>Causal chain replay with <code>db.why()</code> after <code>quickstart</code></sub>
</p>

---

## Pro (managed cloud)

**Hosted for you · No Docker to maintain**

| Step | What you get |
| :---: | :--- |
| **① What it is** | Same engine, **hosted on [db.zizka.ai](https://db.zizka.ai)**. Replay sessions and trace causal chains without running your own databases. **vs OSS:** zero infra · instant API keys · **Fleet** tab on managed cloud. |
| **② How to integrate** | [Sign up →](https://db.zizka.ai/signup?plan=pro) · create agent · copy API key · `pip install zizkadb-sdk` · log with `api_key="zizkadb_live_..."`. Also: npm, MCP, REST. → **[CONNECT.md](CONNECT.md)** |
| **③ Documentation** | [db.zizka.ai/docs](https://db.zizka.ai/docs) · [Swagger](https://db.zizka.ai/swagger) · [Community](https://db.zizka.ai/community) · **50k events/mo · 2 projects · email support** |
| **④ Live dashboard** | **[db.zizka.ai/dashboard](https://db.zizka.ai/dashboard)** — sign up, log from SDK, sessions appear in seconds. Same UI as self-host, always online. |

```python
async with ZizkaDB(api_key="zizkadb_live_...") as db:
    await db.log(agent="support-bot", event="user_message", data={"text": "Hello"})
```

<p align="center">
  <a href="https://db.zizka.ai/dashboard">
    <img src="docs/assets/gallery-why.png" alt="Causal chain replay on managed cloud" width="640"/>
  </a>
  <br/>
  <a href="https://db.zizka.ai/signup?plan=pro"><strong>Get started with Pro →</strong></a>
</p>

---

## Team (managed cloud)

**Multiple agents & projects in production**

| Step | What you get |
| :---: | :--- |
| **① What it is** | Everything in **Pro**, with room to grow. **vs Pro:** 100k events (vs 50k) · 5 projects (vs 2) · **priority support** · built for multi-agent ops with **Fleet** ranking. |
| **② How to integrate** | [Sign up for Team →](https://db.zizka.ai/signup?plan=team) · one agent per service · consistent `session_id` per conversation. → **[Multi-agent wiki](https://github.com/Zizka-ai/ZizkaDB/wiki/Multi-Agent-Apps)** |
| **③ Documentation** | [Plan picker](https://db.zizka.ai/signup/plan) · [Docs](https://db.zizka.ai/docs) · [Production wiki](https://github.com/Zizka-ai/ZizkaDB/wiki/Production-Deployment) · **100k events/mo · 5 projects · priority support** |
| **④ Live dashboard** | **[db.zizka.ai/dashboard](https://db.zizka.ai/dashboard)** — switch agents, compare baselines, Fleet ranking across your workspace. |

```typescript
const db = new ZizkaDB({ apiKey: process.env.ZIZKADB_API_KEY! })
await db.log({ agent: 'sales-bot', event: 'tool_call', data: { tool: 'crm_lookup' }, parentId: prev.eventId })
```

<p align="center">
  <a href="https://db.zizka.ai/signup?plan=team">
    <img src="docs/assets/gallery-why.png" alt="Causal chain replay across agents on managed cloud" width="640"/>
  </a>
  <br/>
  <a href="https://db.zizka.ai/signup?plan=team"><strong>Get started with Team →</strong></a>
</p>

### Tests

Core unit tests plus the SDK and MCP package tests do not require a running ZizkaDB stack:

```bash
# Core tests
(cd core && python -m pip install -r requirements.txt -r requirements-dev.txt && python -m pytest tests -q)

# Python SDK tests
(cd sdk/python && python -m pip install -e '.[dev]' && python -m pytest tests -q)

# MCP tests
(cd mcp && python -m pip install -e '.[dev]' && python -m pytest tests -q)

# TypeScript SDK tests
(cd sdk/typescript && npm ci && npm test)
```

---

## Compare capabilities

| Capability | OSS | Pro | Team |
| --- | :---: | :---: | :---: |
| `db.log()` · `db.why()` · `db.at()` | ✓ | ✓ | ✓ |
| Semantic search & drift baselines | ✓ | ✓ | ✓ |
| Activity · Behavior · Reports · Suggestions | ✓ | ✓ | ✓ |
| **Fleet** tab (managed cloud) | — | ✓ | ✓ |
| Self-host / AGPL | ✓ | — | — |
| Managed hosting | — | ✓ | ✓ |
| 50k events / month | — | ✓ | — |
| 100k events / month | — | — | ✓ |
| 2 projects | — | ✓ | — |
| 5 projects | — | — | ✓ |
| Priority support | — | — | ✓ |
| Enterprise VPC | [Contact →](https://db.zizka.ai/enterprise) | | |

---

## Integrations

| Python | TypeScript | LangChain | CrewAI | MCP (Cursor) | REST |
| :---: | :---: | :---: | :---: | :---: | :---: |
| [`pip install zizkadb-sdk`](https://pypi.org/project/zizkadb-sdk/) | [`npm i zizkadb-sdk`](https://www.npmjs.com/package/zizkadb-sdk) | [Guide →](CONNECT.md#langchain) | [Guide →](CONNECT.md#crewai) | `uvx zizkadb-mcp` | [Swagger →](https://db.zizka.ai/swagger) |

<p align="center">
  <img src="docs/assets/gallery-mcp.png" alt="ZizkaDB MCP in Cursor" width="45%"/>
  &nbsp;
  <img src="docs/assets/gallery-homepage.png" alt="ZizkaDB product site" width="45%"/>
</p>

<details>
<summary><strong>All SDK examples (Python · TypeScript · LangChain · CrewAI · MCP · REST)</strong></summary>

See **[CONNECT.md](CONNECT.md)** for full copy-paste examples.

```bash
pip install zizkadb-sdk
npm install zizkadb-sdk
uvx zizkadb-mcp
zizkadb init my-agent --template basic
```

</details>

---

## Core API

| Function | What it does |
| --- | --- |
| `db.log()` | Record any agent step; use `parent_id` for causal links |
| `db.why()` | Walk backward from any event to root cause |
| `db.search()` | Semantic search over agent history |
| `db.at()` | Reconstruct state at a point in time |
| `db.baseline()` | Detect behavioral drift |
| `db.context_for()` | Inject relevant past events into prompts |
| `db.forget()` | GDPR erasure by metadata filter |

---

## Community & license

| Resource | Link |
| --- | --- |
| Issues | [GitHub Issues](https://github.com/Zizka-ai/ZizkaDB/issues) |
| Discussions | [GitHub Discussions](https://github.com/Zizka-ai/ZizkaDB/discussions) |
| Forum | [db.zizka.ai/community](https://db.zizka.ai/community) |
| Contributing | [CONTRIBUTING.md](CONTRIBUTING.md) |
| Security | [SECURITY.md](SECURITY.md) |
| License | API & dashboard [AGPL-3.0](LICENSE) · MCP [MIT](mcp/LICENSE) |
[![Verified on MseeP](https://mseep.ai/badge.svg)](https://mseep.ai/app/c3411d91-26eb-49df-a8e3-7ef5914a48dd)

Disable telemetry: `export ZIZKADB_TELEMETRY=false`
