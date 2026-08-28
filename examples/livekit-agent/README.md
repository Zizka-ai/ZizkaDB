# LiveKit voice agent + ZizkaDB

One **LiveKit call** → one **ZizkaDB session** (`call_{room_name}`). Transcript text is copied from LiveKit at call end; **no audio** is stored in ZizkaDB.

## Setup

1. Start ZizkaDB:

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
   ```

2. Copy env and add LiveKit keys:

   ```bash
   cp .env.example .env
   ```

3. Install deps:

   ```bash
   pip install -r requirements.txt
   ```

4. Configure `AgentSession` STT/LLM/TTS in `agent.py` for your providers (see [LiveKit docs](https://docs.livekit.io/agents/)).

5. Run:

   ```bash
   python agent.py dev
   ```

6. Dashboard: http://localhost:3001 → **Activity** → `support-voice` → **Sessions**.

## What gets logged

| Event | When |
|-------|------|
| `session_started` | Agent connects |
| `user_message` / `assistant_response` | LiveKit transcript (realtime + report backfill) |
| `tool_call` | From session report pipeline events |
| `session_ended` | After `make_session_report()` ingest |

Package: **`zizkadb-livekit`** on [PyPI](https://pypi.org/project/zizkadb-livekit/) **0.1.0** — one install pulls `zizkadb-sdk` automatically.
