#!/usr/bin/env python3
"""Log a 3-step causal chain and print db.why() — OSS quickstart / README GIF."""

import asyncio
import sys

from zizkadb.demo_run import run_support_order_delay_demo


async def main() -> None:
    # Ensure stdout/stderr use UTF-8 on Windows consoles to prevent encoding crashes
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except (AttributeError, ValueError):
        pass

    await run_support_order_delay_demo()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print(
            "\nStart the stack first:\n"
            "  bash scripts/quickstart.sh\n"
            "  # or: bash scripts/setup-local.sh && zizkadb demo\n",
            file=sys.stderr,
        )
        sys.exit(1)
