# ZizkaDB — Investor Pitch Deck

**Company:** Zizka AI
**Product:** ZizkaDB — the operational database for AI agents
**URL:** https://db.zizka.ai
**Raise:** $200,000 on SAFE (no valuation cap)
**Contact:** founder@zizka.ai

Copy each slide into Google Slides, Keynote, or Pitch. Replace `[bracketed]` fields before sending.

---

## Slide 1 — Title

**ZizkaDB**
_The operational database for AI agents_

Zizka AI · db.zizka.ai
Raising **$200K** · SAFE (uncapped)

[Founder name] · founder@zizka.ai · [Month Year]

---

## Slide 2 — Problem

**Production AI agents are flying blind.**

- **Why did it do that?** — no causal trail from output to trigger
- **What did it know at T?** — chat logs ≠ reconstructible state
- **Is it broken or different?** — prompt/model changes shift behavior silently
- **Memory isn’t ours** — vendor memory lacks your audit / GDPR boundary

Vector DBs answer _similar documents_ — not _what the agent decided, and why_.

---

## Slide 3 — Solution

**ZizkaDB = operational database for agents**

| Capability          | Value                              |
| ------------------- | ---------------------------------- |
| Event log           | Every decision, tool call, message |
| Causal lineage      | `parent_id` → `why()`              |
| Time travel         | Logged state at any timestamp      |
| Semantic search     | Plain-English over history         |
| Behavioral baseline | Drift vs agent’s own past          |
| GDPR forget         | Erasure across SQL + vectors       |

```python
await db.log(agent="bot", event="tool_call", data={...}, parent_id=msg.event_id)
chain = await db.why(tool.event_id)
```

---

## Slide 4 — How it works

```
Agent / MCP / REST → ZizkaDB API
  ├── PostgreSQL (events, tenants, causality)
  ├── Qdrant (semantic search)
  └── Redis (embedding cache)
```

Framework-agnostic · Self-host or managed · No LLM wrapper required

---

## Slide 5 — Why now

- Agents in **production** (support, sales, copilots)
- Observability spend up — traces ≠ operational memory
- Regulation: residency, erasure, audit-friendly stores
- **Window** to own “agent operational DB” before incumbents bundle it

---

## Slide 6 — Market

**Beachhead:** Teams running production AI agents
**Expand:** Agent fleets, platforms, regulated verticals
**Spend adjacency:** Vector DB + observability + data infra

_[Add bottom-up TAM: # teams × ARPU × event growth]_

---

## Slide 7 — Product (live)

- **db.zizka.ai** — managed cloud on AWS
- Self-host Docker (AGPL)
- Python + TypeScript SDKs, MCP for Cursor/Claude
- Dashboard, Stripe billing, docs, `/swagger`, `/trust`
- GitHub: Zizka-ai/ZizkaDB

---

## Slide 8 — Differentiation

|                | LangSmith | Mem0 | Pinecone | **ZizkaDB** |
| -------------- | --------- | ---- | -------- | ----------- |
| Causal why()   | ~         | ✗    | ✗        | ✓           |
| State at T     | ✗         | ✗    | ✗        | ✓           |
| Drift baseline | ✗         | ✗    | ✗        | ✓           |
| Self-host free | ✓         | ✓    | ✗        | ✓           |

Pinecone = document vectors · LangSmith = traces · **ZizkaDB = agent decisions + lineage**

---

## Slide 9 — Business model

| Tier      | Price                                     |
| --------- | ----------------------------------------- |
| Self-host | Free (AGPL)                               |
| Pro       | €39/mo — 100M events, 90d retention       |
| Team      | €99/mo — up to 1B events/mo, 1y retention |

PLG: self-host + free trial → paid cloud

---

## Slide 10 — Traction

| Metric            | Current |
| ----------------- | ------- |
| Live since        | [date]  |
| Registered users  | [N]     |
| Paying / trialing | [N]     |
| Events (30d)      | [N]     |
| Design partners   | [names] |

**6–12 mo goals:** [N] paying teams · white paper · enterprise pilot

---

## Slide 11 — Go-to-market

1. Open source + MCP in Cursor/Claude
2. Docs, community, technical content
3. Self-host → cloud conversion
4. Founder-led design partners

---

## Slide 12 — Moat

- Data gravity (causal history per agent)
- Integrated Postgres + Qdrant + forget + drift
- MCP/SDK distribution
- Category: “operational DB for agents”

---

## Slide 13 — Team

**[Founder name]** — [title]

- [Background]
- [Background]

---

## Slide 14 — The ask

**$200,000 · SAFE (uncapped)**

| Use              | %   |
| ---------------- | --- |
| Engineering      | 50% |
| GTM              | 25% |
| Infra / security | 15% |
| Legal / ops      | 10% |

Runway: [12–18] months to [milestone: e.g. $X MRR / N paying teams]

_Finalize terms with counsel (discount, MFN, pro-rata)._

---

## Slide 15 — Close

**When your agent stops behaving like itself, you know first.**

db.zizka.ai · founder@zizka.ai · GitHub: Zizka-ai/ZizkaDB

---

## 3-minute talk track

1. Agents in prod can’t debug causally or detect drift.
2. ZizkaDB: log, why, at, search, baseline — one API.
3. Live product, self-host + cloud, MCP distribution.
4. €39 / €99 SaaS, PLG from open source.
5. $200K uncapped SAFE → [milestone] in [X] months.

_Not a securities offering. Consult legal counsel._
