"""RAG agent template — retrieval + LLM with automatic lineage."""

import asyncio
import os

from zizkadb import ZizkaDB

AGENT = os.getenv("ZIZKADB_AGENT", "rag-agent")
HOST = os.getenv("ZIZKADB_HOST", "http://localhost:8000")


async def main() -> None:
    async with ZizkaDB(host=HOST) as db:
        async with db.track(agent=AGENT):
            await db.log(agent=AGENT, event="user_message", data={"text": "Find refund policy"})
            await db.log(
                agent=AGENT,
                event="retrieval",
                data={"query": "refund policy", "doc_ids": ["doc-1"], "chunk_count": 1},
            )
            answer = await db.log(
                agent=AGENT,
                event="assistant_response",
                data={"text": "Refunds within 30 days."},
            )
        (await db.why(answer.event_id)).print()


if __name__ == "__main__":
    asyncio.run(main())
