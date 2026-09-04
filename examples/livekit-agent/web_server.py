"""
Local browser UI server for the LiveKit + ZizkaDB example.

Serves static/index.html and mints LiveKit tokens with agent dispatch.
Bind to localhost only — no auth; do not expose publicly.

Run:
  python web_server.py
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import uvicorn
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from livekit.api import AccessToken, RoomAgentDispatch, RoomConfiguration, VideoGrants

load_dotenv()

AGENT_NAME = os.getenv("AGENT_NAME") or os.getenv("ZIZKADB_AGENT", "support-voice")
WEB_PORT = int(os.getenv("WEB_PORT", "8080"))
STATIC_DIR = Path(__file__).parent / "static"
DASHBOARD_URL = os.getenv(
    "ZIZKADB_DASHBOARD_URL",
    "http://localhost:3001/dashboard/activity",
)

app = FastAPI(title="ZizkaDB LiveKit Example UI")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        f"http://localhost:{WEB_PORT}",
        f"http://127.0.0.1:{WEB_PORT}",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/api/config")
async def config() -> dict[str, str]:
    return {
        "agent_name": AGENT_NAME,
        "dashboard_url": f"{DASHBOARD_URL}?agent={AGENT_NAME}",
    }


@app.post("/api/token")
async def create_token() -> dict[str, str]:
    url = os.getenv("LIVEKIT_URL")
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    if not url or not api_key or not api_secret:
        raise HTTPException(
            status_code=500,
            detail="Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in .env",
        )

    room_name = f"call_{uuid.uuid4().hex[:12]}"
    participant_id = f"user_{uuid.uuid4().hex[:8]}"
    token = (
        AccessToken(api_key, api_secret)
        .with_identity(participant_id)
        .with_name("Browser User")
        .with_grants(VideoGrants(room_join=True, room=room_name))
        .with_room_config(
            RoomConfiguration(
                agents=[RoomAgentDispatch(agent_name=AGENT_NAME)],
            ),
        )
        .to_jwt()
    )
    return {"url": url, "token": token, "room": room_name}


if __name__ == "__main__":
    uvicorn.run(
        "web_server:app",
        host="127.0.0.1",
        port=WEB_PORT,
        reload=False,
    )
