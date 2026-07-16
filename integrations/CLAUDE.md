# integrations/ — LangChain & CrewAI Adapters

See root [`CLAUDE.md`](../CLAUDE.md) for full project context.

Two standalone adapter packages: **`zizkadb-langchain`** and **`zizkadb-crewai`**.

---

## Packages

| Package | Directory | Class | Installs from |
|---|---|---|---|
| `zizkadb-langchain` | `integrations/langchain/` | `ZizkaDBCallbackHandler` | git URL (not yet on PyPI) |
| `zizkadb-crewai` | `integrations/crewai/` | `ZizkaDBCrewLogger` | git URL (not yet on PyPI) |

Install for users:
```bash
pip install zizkadb-sdk "zizkadb-langchain @ git+https://github.com/Zizka-ai/ZizkaDB.git@main#subdirectory=integrations/langchain"
```

---

## Important: code lives in two places

Integration source is **duplicated** — keep both in sync when editing:

| Standalone (this directory) | Bundled in SDK |
|---|---|
| `integrations/langchain/zizkadb_langchain/callbacks.py` | `sdk/python/zizkadb/integrations/langchain/callbacks.py` |
| `integrations/crewai/zizkadb_crewai/logger.py` | `sdk/python/zizkadb/integrations/crewai/logger.py` |

The SDK bundles integrations so users can `from zizkadb_langchain import ...` without a separate install. The standalone packages are published for users who only want the adapter without the full SDK.

---

## LangChain usage

```python
from zizkadb import ZizkaDB
from zizkadb_langchain import ZizkaDBCallbackHandler

async with ZizkaDB(api_key="zizkadb_live_...") as db:
    handler = ZizkaDBCallbackHandler(db=db, agent="my-bot")
    result = await chain.ainvoke({"input": "..."}, config={"callbacks": [handler]})
    await db.why(handler.last_event_id).print()
```

---

## CrewAI usage

```python
from zizkadb import ZizkaDB
from zizkadb_crewai import ZizkaDBCrewLogger

async with ZizkaDB(api_key="zizkadb_live_...") as db:
    logger = ZizkaDBCrewLogger(db=db, agent="research-crew")
    kickoff = await logger.log_kickoff(goal="Research AI trends")
    result = crew.kickoff()
    await logger.log_output(str(result), parent_id=kickoff.event_id)
```

---

## Dev install (monorepo)

```bash
pip install -e sdk/python -e integrations/langchain -e integrations/crewai
```

---

## Publish

```bash
bash scripts/publish-integrations.sh
```

Versions are in each package's `pyproject.toml`. Bump together with the SDK versions — see `.cursor/skills/zizkadb-release/SKILL.md`.
