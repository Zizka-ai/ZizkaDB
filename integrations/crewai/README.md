# zizkadb-crewai

Log CrewAI kickoffs, tasks, and outputs to ZizkaDB with `parent_id` lineage.

```bash
pip install zizkadb-sdk zizkadb-crewai crewai
```

```python
from zizkadb import ZizkaDB
from zizkadb_crewai import ZizkaDBCrewLogger

async with ZizkaDB("zizkadb_live_...") as db:
    logger = ZizkaDBCrewLogger(db, agent="research-crew")
    kickoff = await logger.log_kickoff(goal="Research causal logging")
    output = await crew.kickoff_async()
    await logger.log_output(str(output), parent_id=kickoff.event_id)
```

Monorepo dev install:

```bash
pip install -e sdk/python -e integrations/crewai
```
