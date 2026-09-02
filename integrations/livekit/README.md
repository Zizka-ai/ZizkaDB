# ZizkaDB + LiveKit Agents

**PyPI:** [zizkadb-livekit 0.1.0](https://pypi.org/project/zizkadb-livekit/) · depends on `zizkadb-sdk>=0.2.8` + `livekit-agents>=1.3.0`

Log voice calls to ZizkaDB with the same **Activity → Sessions / Events** model as text agents.

- **One `session_id` per call** (use LiveKit room name or job id)
- **Transcript only** — text copied from LiveKit `make_session_report()` (no audio in ZizkaDB)
- **Backend events** — `tool_call`, `tool_result`, `error`, pipeline events from the report
- **Causal lineage** — `parent_id` chains for Why? in the dashboard

## Install

```bash
pip install "zizkadb-livekit>=0.1.0"
```

Start ZizkaDB (Docker quickstart):

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

## Usage

```python
import os
from livekit.agents import AgentServer, JobContext, AgentSession, Agent
from zizkadb import ZizkaDB
from zizkadb_livekit import ZizkaDBLiveKitObserver

server = AgentServer()

async def on_session_end(ctx: JobContext) -> None:
    await observer.ingest_session_report(ctx)

@server.rtc_session(agent_name="support-voice", on_session_end=on_session_end)
async def entrypoint(ctx: JobContext):
    await ctx.connect()

    db = ZizkaDB(host=os.getenv("ZIZKADB_HOST", "http://localhost:8000"))
    global observer
    observer = ZizkaDBLiveKitObserver(
        db,
        agent=os.getenv("ZIZKADB_AGENT", "support-voice"),
        session_id=f"call_{ctx.room.name}",
    )
    await observer.log_session_started(room=ctx.room.name, job_id=ctx.job.id)

    session = AgentSession(...)
    observer.attach(session, job_ctx=ctx)  # optional realtime turns

    await session.start(agent=Agent(instructions="..."), room=ctx.room)
```

Open **http://localhost:3001** → Activity → your agent → Sessions.

## Event types

| Event | Source |
|-------|--------|
| `session_started` | Call connect |
| `user_message` | LiveKit user transcript |
| `assistant_response` | LiveKit agent transcript |
| `tool_call` / `tool_result` | Tools + report pipeline events |
| `error` | Failures |
| `session_ended` | Post-call ingest |

Manual helpers: `log_tool_call`, `log_tool_result`, `log_error`.

## Environment

```bash
export ZIZKADB_HOST=http://localhost:8000   # self-host
export ZIZKADB_AGENT=support-voice
# Cloud: export ZIZKADB_API_KEY=zizkadb_live_...
```

See [examples/livekit-agent](../../examples/livekit-agent/) for a full sample.
