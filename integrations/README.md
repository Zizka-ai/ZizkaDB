# ZizkaDB framework integrations

Official adapters for agent frameworks. Each package is optional — core SDK is always `zizkadb-sdk`.

| Package | PyPI version | Install | Use case |
|---------|--------------|---------|----------|
| `zizkadb-sdk` | **0.2.7** | `pip install zizkadb-sdk` | Core Python client |
| [langchain](langchain/) | **0.1.2** | `pip install zizkadb-langchain` | `ZizkaDBCallbackHandler` on LangChain runnables |
| [crewai](crewai/) | **0.1.2** | `pip install zizkadb-crewai` | `ZizkaDBCrewLogger` for crew kickoff / output |
| [mcp](../mcp/) | **0.1.6** | `uvx zizkadb-mcp` | Cursor, Claude Desktop, Windsurf tools |

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
