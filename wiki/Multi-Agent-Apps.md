# Multi-Agent Apps

Some applications log to **many different agent names** from one deployment.

## Example: zizka.ai productivity chat

Each user gets their own agent namespace:

```
conv-{userId}
```

One EC2 app serves thousands of users → thousands of logical agents.

---

## Problem with per-agent keys

If you create agent `maria-agent` and use its key in zizka.ai, but the app logs to `conv-abc123`, you get:

```
403 — This API key is scoped to agent 'maria-agent' only
```

---

## Solution: tenant-wide API key

1. Dashboard → **Settings**
2. **Tenant-wide API key** → Create
3. Copy full key → set in your app:

```bash
AGENTDB_HOST=https://db.zizka.ai
AGENTDB_API_KEY=zizkadb_live_...
```

4. App can log to any agent name:

```python
await db.log(agent=f"conv-{user_id}", event="user", data={...})
```

Agents are auto-created on first event.

---

## When to use which

| Pattern                                 | Key type            |
| --------------------------------------- | ------------------- |
| One Cursor MCP agent                    | Per-agent key       |
| One support bot                         | Per-agent key       |
| SaaS with per-user memory               | **Tenant-wide key** |
| Microservices (one service = one agent) | Per-agent key each  |

---

## zizka.ai integration checklist

1. Create **tenant-wide key** on db.zizka.ai
2. EC2 `.env`: `AGENTDB_HOST` + `AGENTDB_API_KEY` (exact names, no spaces)
3. Deploy founder-agent with ZizkaDB migration (not Pinecone)
4. `npm run build && pm2 restart founder-agent --update-env`
5. Health check: `curl https://zizka.ai/api/health` → should show `dbZizka`
6. Chat once → look for `conv-{yourUserId}` on dashboard

---

## Verify with curl

```bash
export AGENTDB_API_KEY=zizkadb_live_...
curl -s -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer $AGENTDB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":"conv-test-user","event":"test","data":{}}' \
  https://db.zizka.ai/v1/events
```

HTTP **201** = tenant-wide key works.
