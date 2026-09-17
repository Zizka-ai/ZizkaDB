"""LangGraph-style agent using zizkadb-langgraph middleware."""

import asyncio
import os

from zizkadb import ZizkaDB
from zizkadb_langgraph import ZizkaDBLangGraphMiddleware, wrap_node

AGENT = os.getenv("ZIZKADB_AGENT", "graph-agent")
HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")


async def research(state: dict) -> dict:
    return {"notes": "found 2 sources"}


async def main() -> None:
    async with ZizkaDB(host=HOST) as db:
        async with db.track(agent=AGENT) as ctx:
            mw = ZizkaDBLangGraphMiddleware(db, agent=AGENT, session_id=ctx.session_id)
            state: dict = {}
            node = wrap_node(mw, "research", research)
            await node(state)
        print("Logged graph nodes — open Activity dashboard.")


if __name__ == "__main__":
    asyncio.run(main())
