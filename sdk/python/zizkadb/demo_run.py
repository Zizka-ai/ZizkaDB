"""Run the support-bot causal lineage demo (OSS quick win)."""

from __future__ import annotations

import os

from zizkadb import ZizkaDB

DEFAULT_HOST = "http://localhost:8000"


async def run_support_order_delay_demo(host: str | None = None) -> str:
    """Log a 3-step chain and print db.why(). Returns the leaf event_id."""
    api_host = host or os.getenv("ZIZKADB_HOST", DEFAULT_HOST)
    print(f"→ ZizkaDB @ {api_host}\n")

    async with ZizkaDB(host=api_host) as db:
        user = await db.log(
            agent="support-bot",
            event="user_message",
            data={"text": "Why was my order delayed?"},
        )
        reply = await db.log(
            agent="support-bot",
            event="llm_response",
            data={"model": "gpt-4o", "tokens": 412},
            parent_id=user.event_id,
        )
        tool = await db.log(
            agent="support-bot",
            event="tool_call",
            data={"tool": "lookup_order", "order_id": "ORD-8842"},
            parent_id=reply.event_id,
        )

        print("Logged chain. Walking back with db.why():\n")
        chain = await db.why(tool.event_id)
        chain.print()

    print("\n✓ Done — open the dashboard to explore this agent:")
    print("  http://localhost:3001/login → Open my dashboard →")
    return tool.event_id
