#!/usr/bin/env python3
"""Golden path: LangGraph-style RAG support bot with zero manual parent_id."""

from __future__ import annotations

import asyncio
import os
import sys

from zizkadb import ZizkaDB

try:
    from zizkadb_langgraph import ZizkaDBLangGraphMiddleware, wrap_node
except ImportError:
    print("pip install -e integrations/langgraph", file=sys.stderr)
    raise

AGENT = os.getenv("ZIZKADB_AGENT", "golden-rag-bot")
HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")


async def retrieve(state: dict) -> dict:
    return {"docs": [{"id": "doc-1", "text": "Refund policy: 30 days"}]}


async def generate(state: dict) -> dict:
    docs = state.get("docs", [])
    return {"answer": f"Based on {len(docs)} doc(s): refunds within 30 days."}


async def main() -> int:
    async with ZizkaDB(host=HOST) as db:
        async with db.track(agent=AGENT) as ctx:
            mw = ZizkaDBLangGraphMiddleware(db, agent=AGENT, session_id=ctx.session_id)
            state: dict = {"user_message": "Can I get a refund?"}
            user = await db.log(
                agent=AGENT,
                event="user_message",
                data={"text": state["user_message"]},
                session_id=ctx.session_id,
            )
            state["zizkadb_last_event_id"] = user.event_id

            retrieval = wrap_node(mw, "retrieve", retrieve)
            state = {**state, **await retrieval(state)}

            await db.log(
                agent=AGENT,
                event="retrieval",
                data={"query": state["user_message"], "doc_ids": ["doc-1"], "chunk_count": 1},
            )

            gen = wrap_node(mw, "generate", generate)
            out = await gen(state)
            answer = await db.log(
                agent=AGENT,
                event="assistant_response",
                data={"text": out.get("answer", "")},
            )

        chain = await db.why(answer.event_id)
        if chain.orphan or not chain.chain_complete:
            print("FAIL: incomplete chain", file=sys.stderr)
            chain.print()
            return 1
        types = [e.event for e in chain.chain]
        if "retrieval" not in types:
            print("FAIL: retrieval not in why() chain", file=sys.stderr)
            return 1
        print("OK: golden path chain length", chain.chain_length)
        chain.print()
        return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
