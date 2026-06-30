# Troubleshooting

## API key shows "Never used"

No successful authenticated request reached the API.

| Check               | Action                                                 |
| ------------------- | ------------------------------------------------------ |
| Wrong env var name  | Use `ZIZKADB_API_KEY` or `AGENTDB_API_KEY`, not `API=` |
| Space in key        | Re-paste as one continuous line                        |
| Wrong URL           | Must be `https://db.zizka.ai/v1/events` not `/v1_`     |
| Placeholder in curl | Use real key, not `YOUR_KEY`                           |
| Revoked key         | Create new key on agent page                           |

Test from server:

```bash
cd ~/your-app
export $(grep -E '^AGENTDB_API_KEY=' .env | xargs)
curl -s -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer ${AGENTDB_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{"agent":"YOUR_AGENT","event":"test","data":{}}' \
  https://db.zizka.ai/v1/events
```

---

## HTTP 401 Invalid API key

- Key typo, space, or truncated paste
- Key revoked
- Using JWT where API key expected (or vice versa)

---

## HTTP 403 Agent mismatch

Your key is scoped to one agent but code logged to another.

```
Key for: maria-agent
Code sent: conv-user123
```

**Fix:** Use same agent name in code, or create a **tenant-wide key** (Settings).

SDK raises `AgentScopeError` (Python/TypeScript).

---

## Dashboard empty but curl works

| Cause                              | Fix                                                 |
| ---------------------------------- | --------------------------------------------------- |
| Viewing wrong agent                | Open the agent name your code uses                  |
| Settings test event                | Goes to `dashboard-connection-test`, not your agent |
| Different tenant                   | SDK key and dashboard login must be same account    |
| Self-host dev login vs email login | Use same auth path                                  |

Use **Test agent** on the agent page.

---

## npm run build ENOENT (EC2)

```
Could not read package.json: .../agentdb/package.json
```

**Fix:** `cd ~/agentdb/dashboard` then `npm run build`

---

## Search returns nothing

1. Configure embeddings: Settings → Embeddings
2. Log events first (need history to search)
3. Use semantic queries, not exact string match

---

## baseline shows warming_up

Need more sessions with `session_id` on events. Keep logging.

---

## zizka.ai chat not logging to ZizkaDB

1. Use **tenant-wide key** (app logs to `conv-{userId}`)
2. Deploy founder-agent ZizkaDB migration (remove Pinecone)
3. `.env`: `AGENTDB_HOST=https://db.zizka.ai` + `AGENTDB_API_KEY=...`
4. `npm run build && pm2 restart founder-agent --update-env`
5. `curl https://zizka.ai/api/health` → should show `dbZizka`, not `pinecone`

---

## Legacy keys

`agdb_live_...` keys from early signups still authenticate. No forced rotation.

---

## Get help

- [GitHub Issues](https://github.com/Zizka-ai/ZizkaDB/issues)
- [db.zizka.ai/docs](https://db.zizka.ai/docs)
- Community: db.zizka.ai/community
