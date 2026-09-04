# LiveKit voice agent + ZizkaDB + browser UI

One **LiveKit call** → one **ZizkaDB session** (`call_{room_name}`). Transcript text is copied from LiveKit at call end; **no audio** is stored in ZizkaDB.

This example includes:

- **`agent.py`** — LiveKit voice worker + `ZizkaDBLiveKitObserver` (OpenAI Realtime)
- **`web_server.py`** — local browser UI + token endpoint (FastAPI, no React)
- **`static/index.html`** — Start / End call page at http://localhost:8080

## Architecture

```
Browser :8080  →  web_server.py (token)  →  LiveKit Cloud (room)
                                              ↓
                                         agent.py dev (worker)
                                              ↓
                                         ZizkaDB :8000 (events)
Dashboard :3001  ←  read sessions/events
```

## Prerequisites (your side)

| Item | Required |
|------|----------|
| Docker Desktop | Yes — runs ZizkaDB locally |
| Python 3.10+ | Yes |
| [LiveKit Cloud](https://cloud.livekit.io) (free) | Yes — `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` |
| [OpenAI API key](https://platform.openai.com) | Yes — Realtime voice |
| ZizkaDB cloud API key | No — local Docker is enough |

## One-time setup

1. Start ZizkaDB (from repo root):

   ```bash
   bash scripts/setup-local.sh
   ```

   Confirm http://localhost:8000/health and http://localhost:3001/login → **Open my dashboard**.

2. Configure this example:

   ```bash
   cd examples/livekit-agent
   cp .env.example .env
   # Edit .env — paste LiveKit + OpenAI keys
   ```

3. Install dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate   # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

## Run (3 terminals)

**Terminal 1 — ZizkaDB** (if not already running):

```bash
# from repo root
docker compose -f infra/docker-compose.yml -f infra/docker-compose.dev.yml up -d
```

**Terminal 2 — voice agent worker:**

```bash
cd examples/livekit-agent
source .venv/bin/activate
python agent.py dev
```

Wait until the worker is registered (dev mode ready).

**Terminal 3 — browser UI:**

```bash
cd examples/livekit-agent
source .venv/bin/activate
python web_server.py
```

Open **http://localhost:8080** in Chrome or Edge → **Start call** → allow microphone → speak → **End call**.

Verify: http://localhost:3001 → **Activity** → `support-voice` → **Sessions**.

## What gets logged

| Event | When |
|-------|------|
| `session_started` | Agent connects to room |
| `user_message` / `assistant_response` | LiveKit transcript (realtime + report backfill) |
| `tool_call` | From session report pipeline events (if tools run) |
| `session_ended` | After `make_session_report()` ingest on hangup |

## Environment variables

| Variable | Used by | Purpose |
|----------|---------|---------|
| `LIVEKIT_URL` | agent + web_server | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | agent + web_server | Token signing |
| `LIVEKIT_API_SECRET` | web_server only | Never exposed to browser |
| `OPENAI_API_KEY` | agent | OpenAI Realtime voice |
| `ZIZKADB_HOST` | agent | Local API (default `http://localhost:8000`) |
| `ZIZKADB_AGENT` | agent | Dashboard agent name |
| `AGENT_NAME` | web_server | Must match `ZIZKADB_AGENT` for dispatch |
| `WEB_PORT` | web_server | Default `8080` |

## Fallback: terminal-only test

Without the browser UI:

```bash
python agent.py console
```

Or use [LiveKit Agent Console](https://docs.livekit.io/agents/start/console/) with agent name `support-voice`.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Agent never joins | Run `python agent.py dev` before starting a call |
| Failed to get token | Check `LIVEKIT_*` vars in `.env` |
| No agent audio | Set `OPENAI_API_KEY`; restart agent worker |
| No ZizkaDB session | Confirm `ZIZKADB_HOST` and http://localhost:8000/health |
| Agent name mismatch | `AGENT_NAME` and `ZIZKADB_AGENT` must both be `support-voice` |
| Mic blocked | Use Chrome; allow microphone for localhost |

## Security note

`web_server.py` binds to `127.0.0.1` only and has no auth on `/api/token`. Do not expose port 8080 to the public internet.

## Package

**`zizkadb-livekit`** on [PyPI](https://pypi.org/project/zizkadb-livekit/) — one install pulls `zizkadb-sdk` automatically.
