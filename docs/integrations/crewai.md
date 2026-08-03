# CrewAI integration

Self-hosted, open-source observability and **causal debugging** for [CrewAI](https://crewai.com).
This page is the reference for using and extending the integration.

- Package: [`zizkadb-crewai`](https://pypi.org/project/zizkadb-crewai/) (PyPI, AGPL-3.0)
- Class: `ZizkaDBCrewLogger`
- Source (kept in sync in two places):
  - Standalone: [`integrations/crewai/zizkadb_crewai/logger.py`](../../integrations/crewai/zizkadb_crewai/logger.py)
  - Bundled in SDK: [`sdk/python/zizkadb/integrations/crewai/logger.py`](../../sdk/python/zizkadb/integrations/crewai/logger.py)
- Runnable example: [`examples/crewai-agent/`](../../examples/crewai-agent/)

## Why this exists

A CrewAI run is normally a black box: when the output is wrong, you can't see which task or agent
caused it. `ZizkaDBCrewLogger` logs each step to ZizkaDB with a `parent_id` link, so a run becomes a
**causal tree**. `db.why(event_id)` walks that tree back to the root cause:

```
crew_kickoff → crew_task (Researcher) → crew_task (Writer) → crew_output
```

It doesn't only show *what* happened; it explains *why* it happened.

## Install

```bash
pip install zizkadb-sdk zizkadb-crewai crewai
```

## Quickstart

```python
from zizkadb import ZizkaDB
from zizkadb_crewai import ZizkaDBCrewLogger

# OSS-first: default to a self-hosted instance; pass api_key only for remote/cloud.
async with ZizkaDB(host="http://localhost:8000") as db:
    logger = ZizkaDBCrewLogger(db=db, agent="research-crew")

    await logger.log_kickoff(goal="Research causal logging for AI agents")
    result = await crew.kickoff_async()
    for task_output in result.tasks_output:
        await logger.log_task(
            description=task_output.description,
            output=str(task_output.raw)[:2000],
        )
    await logger.log_output(str(result))

    (await db.why(logger.last_event_id)).print()   # explain WHY
```

## API reference

`ZizkaDBCrewLogger(db, agent)` — `db` is an open `ZizkaDB` client, `agent` is the agent id events
are logged under. The logger tracks `last_event_id` and auto-links each event to the previous one, so
`parent_id` is optional.

| Method | Event type | Notes |
|---|---|---|
| `await log_kickoff(goal, **extra)` | `crew_kickoff` | Root of the chain. `extra` kwargs are merged into event `data`. |
| `await log_task(description, *, parent_id=None, **extra)` | `crew_task` | One node per task. Pass `output=...` via `extra` to store the task result. |
| `await log_output(output, *, parent_id=None, **extra)` | `crew_output` | Final result. |

Each method returns a `LogResult` (has `.event_id`) and updates `logger.last_event_id`. Under the hood
these map to `db.log(agent=..., event=..., data=..., parent_id=...)` — the same causal model the core
uses (`events.parent_event_id`, walked by a recursive CTE in `db.why()`).

## How it maps to ZizkaDB

- Events land in the `events` table with `parent_event_id` set (see [`core/db/schema.sql`](../../core/db/schema.sql)).
- `db.why(event_id)` returns a `CausalChain` (root-first) with `.print()`.
- The same run is visible on the dashboard timeline at http://localhost:3001.

## Extending the integration

When editing the logger, **update both copies** (standalone + bundled — see the table above) or they
drift. Then lint, test, and republish:

```bash
/Users/apple/Library/Python/3.14/bin/ruff check integrations/ sdk/python/
pytest sdk/python/tests/ -v
bash scripts/publish-integrations.sh          # bump versions in each pyproject.toml first
```

The example ships a CI-safe integration test
([`examples/crewai-agent`](../../examples/crewai-agent/) mirrors it) that logs
`kickoff → task → task → output` and asserts `db.why()` rebuilds the 4-event chain with root
`crew_kickoff` — it auto-skips when no ZizkaDB is reachable, so it never flakes.

### Out of scope (future upgrade)

An automatic CrewAI event-bus listener (`BaseEventListener` on `crewai_event_bus`) would remove the
manual `log_*` calls. It needs a new `zizkadb-crewai` release and is intentionally not shipped yet.

## Ecosystem

ZizkaDB is listed in CrewAI's community integrations list,
[`awesome-crewai`](https://github.com/crewAIInc/awesome-crewai) (PR #91). Note: the older
`crewAIInc/crewAI-examples` repo is **archived** and read-only — `awesome-crewai` is the active home
for third-party integrations.

See also: [`integrations/crewai/README.md`](../../integrations/crewai/README.md) ·
[`integrations/CLAUDE.md`](../../integrations/CLAUDE.md) (contributor guide).
