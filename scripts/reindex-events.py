#!/usr/bin/env python3
"""Mark failed/skipped embeddings as pending for the embed worker to retry."""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "core"))


async def main() -> None:
    from db.connection import init_db, close_db, get_pool

    await init_db()
    pool = get_pool()
    result = await pool.execute(
        """
        UPDATE events
        SET index_status = 'pending'
        WHERE index_status IN ('failed', 'pending')
        """
    )
    print(result)
    await close_db()


if __name__ == "__main__":
    asyncio.run(main())
