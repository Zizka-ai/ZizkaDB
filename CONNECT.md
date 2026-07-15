# Connect your agent (self-host / OSS)

## Start the stack (pick one)

**No repo clone** (recommended for new users):

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

Only ~4 small files land in `~/.zizkadb/infra/`. Pre-built images from `ghcr.io/zizka-ai/`.

**From a git clone** (contributors):

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB
bash scripts/quickstart.sh
```

Open **http://localhost:3001/login** → **Open my dashboard →** (no signup, no API key on localhost).

Pick your stack below. Use the **same agent name** in code and dashboard.

---

## Python SDK

```bash
pip install zizkadb-sdk
```

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    async with ZizkaDB(host="http://localhost:8000") as db:
        user = await db.log(
            agent="my-bot",
            event="user_message",
            data={"text": "Hello"},
        )
        await db.log(
            agent="my-bot",
            event="tool_call",
            data={"tool": "search"},
            parent_id=user.event_id,
        )
        print("Logged — refresh dashboard → Agents → my-bot")

asyncio.run(main())
```

Env vars (optional):

```bash
export ZIZKADB_HOST=http://localhost:8000
export ZIZKADB_AGENT=my-bot
```

---

## TypeScript SDK

```bash
npm install zizkadb-sdk
```

```typescript
import { ZizkaDB } from 'zizkadb-sdk'

const db = new ZizkaDB({ host: 'http://localhost:8000' })

const user = await db.log({
  agent: 'my-bot',
  event: 'user_message',
  data: { text: 'Hello' },
})
await db.log({
  agent: 'my-bot',
  event: 'tool_call',
  data: { tool: 'search' },
  parentId: user.eventId,
})
```

---

## LangChain

```bash
pip install zizkadb-sdk zizkadb-langchain
```

```python
import asyncio
from langchain_openai import ChatOpenAI
from zizkadb import ZizkaDB
from zizkadb_langchain import ZizkaDBCallbackHandler

async def main():
    async with ZizkaDB(host="http://localhost:8000") as db:
        handler = ZizkaDBCallbackHandler(db=db, agent="my-bot")
        llm = ChatOpenAI(model="gpt-4o-mini")
        await llm.ainvoke("Hello", config={"callbacks": [handler]})

asyncio.run(main())
```

Or scaffold: `zizkadb init my-agent --template langchain`

---

## CrewAI

```bash
pip install zizkadb-sdk zizkadb-crewai
```

```python
from crewai import Agent, Crew, Task
from zizkadb import ZizkaDB
from zizkadb_crewai import ZizkaDBCrewLogger

db = ZizkaDB(host="http://localhost:8000")
logger = ZizkaDBCrewLogger(db, agent="my-bot")
# attach logger to your crew kickoff — see integrations/crewai/
```

Or scaffold: `zizkadb init my-agent --template crewai`

---

## MCP (Cursor, Claude Desktop, Windsurf)

```bash
pip install zizkadb-mcp
# or: uvx zizkadb-mcp
```

`~/.cursor/mcp.json` (or Claude Desktop config):

```json
{
  "mcpServers": {
    "zizkadb": {
      "command": "uvx",
      "args": ["zizkadb-mcp"],
      "env": {
        "ZIZKADB_HOST": "http://localhost:8000"
      }
    }
  }
}
```

On localhost the dev key is auto-injected. Reload MCP in your editor.

Or scaffold: `zizkadb init my-agent --template mcp-cursor`

Full guide: [mcp/README.md](mcp/README.md)

---

## REST (any language)

```bash
curl -s -H "Authorization: Bearer zizkadb_dev_local" \
  -H "Content-Type: application/json" \
  -d '{"agent":"my-bot","event":"started","data":{"ok":true}}' \
  http://localhost:8000/v1/events
```

Swagger: http://localhost:8000/swagger

---

## Verify

1. Dashboard → **Agents** — `my-bot` appears within ~30s  
2. Settings → **Send test event** (separate test agent)  
3. Agent page → **Test agent**

---

## Production self-host

Local dev uses the auto dev key. For a VPS with team login:

1. `docker compose -f infra/docker-compose.yml up -d`
2. `bash infra/deploy-selfhost.sh`
3. Set `EMAIL_*` in `infra/.env`, `NEXT_PUBLIC_DEV_MODE=false`
4. Create API keys in Settings → use in SDK/MCP

See [wiki/Self-Hosting](https://github.com/Zizka-ai/ZizkaDB/wiki/Self-Hosting) and [Production Deployment](https://github.com/Zizka-ai/ZizkaDB/wiki/Production-Deployment).

---

## Managed cloud

If you prefer hosted ZizkaDB instead of Docker: [db.zizka.ai/signup](https://db.zizka.ai/signup) — same SDK, use `zizkadb_live_...` keys instead of `host=`.
