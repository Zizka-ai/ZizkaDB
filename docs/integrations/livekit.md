# LiveKit integration

**Package:** `zizkadb-livekit` on PyPI **0.1.0**  
**Install:** one command — pulls `zizkadb-sdk` and `livekit-agents` automatically.

```bash
pip install zizkadb-livekit
```

Start ZizkaDB (Docker):

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

## What it does

| Concept | Behavior |
|---------|----------|
| **Session** | One LiveKit call = one `session_id` (e.g. `call_{room_name}`) |
| **Transcript** | Text from LiveKit `make_session_report()` — no audio in ZizkaDB |
| **Events** | `session_started`, `user_message`, `assistant_response`, `tool_call`, `tool_result`, `error`, `session_ended` |
| **Why?** | Causal `parent_id` chain — same Activity UI as text agents |

## Quick wiring

```python
from zizkadb import ZizkaDB
from zizkadb_livekit import ZizkaDBLiveKitObserver

observer = ZizkaDBLiveKitObserver(db, agent="support-voice", session_id=f"call_{room}")
await observer.ingest_session_report(ctx)  # on_session_end
```

## Environment

```bash
export ZIZKADB_HOST=http://localhost:8000   # self-host Docker stack
export ZIZKADB_AGENT=support-voice          # must match dashboard agent name
# Cloud: export ZIZKADB_API_KEY=zizkadb_live_...
```

## More

- Runnable example: [examples/livekit-agent](../../examples/livekit-agent/)
- Package README: [integrations/livekit/README.md](../../integrations/livekit/README.md)
- Framework status: [integrate/frameworks.md](../integrate/frameworks.md)
- Copy-paste connect guide: [CONNECT.md](../../CONNECT.md#livekit-agents-voice)
