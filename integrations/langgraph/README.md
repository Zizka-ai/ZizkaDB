# zizkadb-langgraph

LangGraph middleware for [ZizkaDB](https://db.zizka.ai) — logs `graph_node` / `graph_node_done` with automatic `parent_id` via graph state.

```bash
pip install zizkadb-langgraph
```

```python
from zizkadb import ZizkaDB
from zizkadb_langgraph import ZizkaDBLangGraphMiddleware, wrap_node

async with ZizkaDB(host="http://localhost:8000") as db:
    async with db.track(agent="research-bot") as ctx:
        mw = ZizkaDBLangGraphMiddleware(db, agent="research-bot", session_id=ctx.session_id)

        async def retrieve(state):
            return {"docs": ["a", "b"]}

        graph.add_node("retrieve", wrap_node(mw, "retrieve", retrieve))
```

See `examples/golden-path/langgraph-rag-bot/` for the full RAG support-bot reference.
