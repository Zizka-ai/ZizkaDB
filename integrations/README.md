# ZizkaDB framework integrations

Official adapters for agent frameworks. Each package is optional — core SDK is always `zizkadb-sdk`.

| Package | Install | Use case |
|---------|---------|----------|
| [langchain](langchain/) | `pip install zizkadb-langchain` | `ZizkaDBCallbackHandler` on LangChain runnables |
| [crewai](crewai/) | `pip install zizkadb-crewai` | `ZizkaDBCrewLogger` for crew kickoff / output |
| [mcp](../mcp/) | `uvx zizkadb-mcp` | Cursor, Claude Desktop, Windsurf tools |

**Configure once (all packages):**

```bash
export ZIZKADB_API_KEY=zizkadb_live_...
export ZIZKADB_AGENT=my-bot          # must match dashboard agent name
# Self-host: export ZIZKADB_HOST=http://localhost:8000
# Optional: export ZIZKADB_TELEMETRY=false
```

Monorepo dev:

```bash
pip install -e sdk/python -e integrations/langchain -e integrations/crewai
```

Scaffold a project:

```bash
pip install zizkadb-sdk
zizkadb init my-agent --template langchain
```
