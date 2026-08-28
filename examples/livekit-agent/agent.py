"""
LiveKit voice agent → ZizkaDB Activity (Sessions + Events).

Prerequisites:
  1. ZizkaDB: bash scripts/quickstart-remote.sh  (or quickstart.sh from clone)
  2. LiveKit Cloud project + API keys in .env
  3. pip install -r requirements.txt

Run:
  python agent.py dev

After a test call, open http://localhost:3001 → Activity → support-voice → Sessions.
"""

from __future__ import annotations

import os

from livekit.agents import Agent, AgentServer, JobContext, AgentSession
from zizkadb import ZizkaDB
from zizkadb_livekit import ZizkaDBLiveKitObserver

server = AgentServer()

# Set in entrypoint — used by on_session_end
_observer: ZizkaDBLiveKitObserver | None = None


async def on_session_end(ctx: JobContext) -> None:
    if _observer is not None:
        await _observer.ingest_session_report(ctx)


@server.rtc_session(agent_name="support-voice", on_session_end=on_session_end)
async def entrypoint(ctx: JobContext) -> None:
    global _observer
    await ctx.connect()

    host = os.getenv("ZIZKADB_HOST", "http://localhost:8000")
    api_key = os.getenv("ZIZKADB_API_KEY")
    agent_name = os.getenv("ZIZKADB_AGENT", "support-voice")
    session_id = f"call_{ctx.room.name}"

    if api_key:
        db = ZizkaDB(api_key=api_key)
    else:
        db = ZizkaDB(host=host)

    _observer = ZizkaDBLiveKitObserver(db, agent=agent_name, session_id=session_id)
    await _observer.log_session_started(
        room=ctx.room.name,
        job_id=getattr(ctx.job, "id", None),
    )

    session = AgentSession(
        # Configure STT/LLM/TTS for your stack, e.g.:
        # stt=..., llm=..., tts=...,
    )
    _observer.attach(session, job_ctx=ctx)

    await session.start(
        agent=Agent(
            instructions="You are a helpful voice support agent. Be concise.",
        ),
        room=ctx.room,
    )


if __name__ == "__main__":
    from livekit.agents import cli

    cli.run_app(server)
