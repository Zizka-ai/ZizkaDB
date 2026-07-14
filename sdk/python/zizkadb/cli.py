"""zizkadb CLI — scaffold agent projects and run the OSS lineage demo."""

from __future__ import annotations

import argparse
import asyncio
import os
import shutil
import sys
from pathlib import Path

TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"

TEMPLATES = ("basic", "openai", "langchain", "crewai", "mcp-cursor")
DEFAULT_HOST = "http://localhost:8000"


def _copy_template(name: str, dest: Path) -> None:
    src = TEMPLATES_DIR / name
    if not src.is_dir():
        raise SystemExit(f"Unknown template: {name}")
    if dest.exists() and any(dest.iterdir()):
        raise SystemExit(f"Directory not empty: {dest}")
    dest.mkdir(parents=True, exist_ok=True)
    for dirpath, _dirnames, filenames in os.walk(src):
        for name in filenames:
            if name == ".DS_Store" or name.endswith(".pyc"):
                continue
            path = Path(dirpath) / name
            rel = path.relative_to(src)
            out = dest / rel
            out.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, out)


def cmd_init(args: argparse.Namespace) -> None:
    dest = Path(args.name).resolve()
    _copy_template(args.template, dest)
    print(f"✓ Created {dest.name}/ ({args.template} template)")
    print()
    print("Next:")
    print(f"  cd {dest.name}")
    print("  cp .env.example .env   # add ZIZKADB_API_KEY or ZIZKADB_HOST")
    print("  pip install -r requirements.txt")
    if args.template == "mcp-cursor":
        print("  # Copy mcp.json → ~/.cursor/mcp.json and reload Cursor")
    else:
        print("  python agent.py")


def cmd_demo(args: argparse.Namespace) -> None:
    host = args.host or os.getenv("ZIZKADB_HOST", DEFAULT_HOST)
    try:
        from zizkadb.demo_run import run_support_order_delay_demo

        asyncio.run(run_support_order_delay_demo(host))
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        print(
            "\nStart the OSS stack first:\n"
            "  git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB\n"
            "  bash scripts/quickstart.sh\n",
            file=sys.stderr,
        )
        raise SystemExit(1) from e


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        prog="zizkadb",
        description="ZizkaDB CLI — OSS demo and agent project scaffolding",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    demo_p = sub.add_parser(
        "demo",
        help="Run the support-bot causal lineage demo (requires local stack)",
    )
    demo_p.add_argument(
        "--host",
        default=None,
        help=f"API URL (default: ZIZKADB_HOST or {DEFAULT_HOST})",
    )
    demo_p.set_defaults(func=cmd_demo)

    init_p = sub.add_parser("init", help="Create a new agent project from a template")
    init_p.add_argument("name", help="Project directory name")
    init_p.add_argument(
        "--template",
        "-t",
        choices=TEMPLATES,
        default="basic",
        help="Starter template (default: basic)",
    )
    init_p.set_defaults(func=cmd_init)

    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
