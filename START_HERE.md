# Start here

**Free, local, no signup.** Audit your first agent in a few minutes.

## 1. Run the demo

```bash
curl -fsSL https://raw.githubusercontent.com/Zizka-ai/ZizkaDB/main/scripts/quickstart-remote.sh | bash
```

## 2. Check the terminal

You should see a causal chain ending in `user_message · Why was my order delayed?`

## 3. Open the dashboard

http://localhost:3001/login → **Open my dashboard →**

## 4. Connect your code

```python
async with ZizkaDB(host="http://localhost:8000") as db:
    ...
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
