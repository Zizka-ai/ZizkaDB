# Start here

**Free, local, no signup.** Audit your first AI agent in a few minutes.

Open-source agent debugging: causal lineage, session replay, drift baselines — works with **LangChain**, **CrewAI**, **Cursor MCP**, Python, and TypeScript.

## 1. Run the demo

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

Requires Docker. First image pull may take 5–10 minutes.

## 2. Check the terminal

You should see a causal chain ending in `user_message · Why was my order delayed?`

```text
$ zizkadb demo
tool_call · lookup_order · ORD-8842
  └── llm_response · gpt-4o
        └── user_message · Why was my order delayed?
```

## 3. Open the dashboard

http://localhost:3001/login → **Open my dashboard →** (no account, no API key)

## 4. Connect your code

```python
async with ZizkaDB(host="http://localhost:8000") as db:
    user = await db.log(agent="my-bot", event="user_message", data={"text": "Hello"})
    tool = await db.log(agent="my-bot", event="tool_call", data={"tool": "search"}, parent_id=user.event_id)
    (await db.why(tool.event_id)).print()
```

Full guide: [CONNECT.md](CONNECT.md)

## Run again

```bash
pip install zizkadb-sdk && zizkadb demo
```

## Next

- [worked/01-support-order-delay](worked/01-support-order-delay/) — the demo scenario
- [examples/](examples/) — LangChain, CrewAI, OpenAI, MCP
- [wiki/Getting-Started](https://github.com/Zizka-ai/ZizkaDB/wiki/Getting-Started)

**Managed cloud (optional, no Docker):** [db.zizka.ai/signup](https://db.zizka.ai/signup)
