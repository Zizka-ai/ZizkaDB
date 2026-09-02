# LiveKit integration

**Package:** [`zizkadb-livekit`](https://pypi.org/project/zizkadb-livekit/) **0.1.0** on PyPI (AGPL-3.0)  
**Class:** `ZizkaDBLiveKitObserver`  
**Source:** [`integrations/livekit/zizkadb_livekit/`](../../integrations/livekit/zizkadb_livekit/)  
**Runnable example:** [`examples/livekit-agent/`](../../examples/livekit-agent/)

## Why this exists

Voice agents built with [LiveKit Agents](https://docs.livekit.io/agents/) need the same operational audit trail as text agents: *why did the agent say that, and which tool caused it?*

`zizkadb-livekit` maps **one LiveKit call → one ZizkaDB session** in the existing **Activity → Sessions / Events** UI. Transcript text is copied from LiveKit's session report at call end — **no audio** is stored in ZizkaDB.

Event types match text agents: `session_started`, `user_message`, `assistant_response`, `tool_call`, `tool_result`, `error`, `session_ended`. Each event links via `parent_id` so `db.why()` works in the dashboard.

## Install (one command)

```bash
pip install zizkadb-livekit
```

Pulls `zizkadb-sdk>=0.2.8` and `livekit-agents>=1.3.0` automatically. No separate core SDK install.

Start ZizkaDB (Docker):

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

## Quick wiring

```python
import os
from livekit.agents import AgentServer, JobContext, AgentSession, Agent
from zizkadb import ZizkaDB
from zizkadb_livekit import ZizkaDBLiveKitObserver

server = AgentServer()
_observer: ZizkaDBLiveKitObserver | None = None

async def on_session_end(ctx: JobContext) -> None:
    if _observer is not None:
        await _observer.ingest_session_report(ctx)

@server.rtc_session(agent_name="support-voice", on_session_end=on_session_end)
async def entrypoint(ctx: JobContext):
    global _observer
    await ctx.connect()

    db = ZizkaDB(host=os.getenv("ZIZKADB_HOST", "http://localhost:8000"))
    _observer = ZizkaDBLiveKitObserver(
        db,
        agent=os.getenv("ZIZKADB_AGENT", "support-voice"),
        session_id=f"call_{ctx.room.name}",
    )
    await _observer.log_session_started(room=ctx.room.name, job_id=ctx.job.id)

    session = AgentSession(...)  # your STT / LLM / TTS
    _observer.attach(session, job_ctx=ctx)  # optional realtime turns
    await session.start(agent=Agent(instructions="..."), room=ctx.room)
```

After a test call: **http://localhost:3001 → Activity → support-voice → Sessions**.

## Environment

| Variable | Purpose |
|----------|---------|
| `ZIZKADB_HOST` | Self-host API URL (default `http://localhost:8000`) |
| `ZIZKADB_AGENT` | Agent name — must match dashboard |
| `ZIZKADB_API_KEY` | Cloud key (`zizkadb_live_...`) instead of `host=` |
| LiveKit vars | `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` — see [LiveKit docs](https://docs.livekit.io/) |

## Event mapping

| ZizkaDB event | Source |
|---------------|--------|
| `session_started` | Call connect |
| `user_message` | LiveKit user transcript |
| `assistant_response` | LiveKit agent transcript |
| `tool_call` / `tool_result` | Tools + pipeline events from report |
| `error` | Failures |
| `session_ended` | Post-call ingest |

Manual helpers: `log_tool_call`, `log_tool_result`, `log_error`.

## Monorepo dev

```bash
pip install -e sdk/python -e integrations/livekit
pytest sdk/python/tests/test_livekit_observer.py -v
```

## Related

- Package README: [integrations/livekit/README.md](../../integrations/livekit/README.md)
- Connect guide: [CONNECT.md](../../CONNECT.md#livekit-agents-voice)
- Framework status: [integrate/frameworks.md](../integrate/frameworks.md)
