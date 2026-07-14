#!/usr/bin/env python3
"""Worked example: support bot traces an order delay with causal lineage."""

import asyncio
import os
import sys

from zizkadb import ZizkaDB

HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")


async def main() -> None:
    print("Scenario: customer asks why order ORD-8842 is delayed.\n")
    print(f"→ ZizkaDB @ {HOST}\n")

    async with ZizkaDB(host=HOST) as db:
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
        (await db.why(tool.event_id)).print()

    print("\n✓ Expected tree:")
    print("  tool_call (lookup_order, ORD-8842)")
    print("    └── llm_response")
    print("          └── user_message")
    print("\nDashboard: http://localhost:3001/login → Agents → support-bot")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print("\nRun: bash scripts/quickstart.sh", file=sys.stderr)
        sys.exit(1)
