# Worked example 01 — Support order delay

A minimal agent session you can run in under a minute after [OSS quickstart](../../README.md#-start-in-60-seconds-no-repo-clone).

## Story

A **support-bot** receives *"Why was my order delayed?"*, calls the LLM, then invokes `lookup_order` for **ORD-8842**. Each step is logged with `parent_id` so you can walk backward with `why()`.

## Run it

**No clone** (stack already up from curl quickstart):

```bash
pip install zizkadb-sdk
zizkadb demo
```

**From a git clone:**

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB
bash scripts/quickstart.sh
# or step by step:
bash scripts/setup-local.sh
pip install zizkadb-sdk
python worked/01-support-order-delay/demo.py
```

## Expected output

```
tool_call: {'tool': 'lookup_order', 'order_id': 'ORD-8842'}
  └── llm_response: {'model': 'gpt-4o', 'tokens': 412}
        └── user_message: {'text': 'Why was my order delayed?'}
```

## Dashboard

1. Open http://localhost:3001/login  
2. Click **Open my dashboard →**  
3. Open agent **support-bot** → Events / sessions

## Next

- [CONNECT.md](../../CONNECT.md) — wire your own agent (Python, TypeScript, LangChain, CrewAI, MCP, REST)  
- `zizkadb init my-agent --template basic` — scaffold a project  
- [examples/](../../examples/) — fuller agent samples
