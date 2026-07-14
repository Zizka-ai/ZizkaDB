# Troubleshooting

## OSS quickstart (localhost)

| Problem | Fix |
|---------|-----|
| Docker not running | Start Docker Desktop or OrbStack |
| `API did not become healthy` | First pull can take 1–2 min. Check `docker compose -f ~/.zizkadb/infra/docker-compose.quickstart.yml logs api` |
| GHCR image pull fails | Clone repo: `git clone … && bash scripts/quickstart.sh` (builds locally) |
| `docker compose ... --build` hangs/fails on `load metadata for docker.io/library/...` with `DeadlineExceeded` | Registry metadata check timed out even though the base image is already cached locally. Pre-pull once: `docker pull python:3.12-slim && docker pull node:20-alpine`, then re-run `bash scripts/setup-local.sh` — the build reuses the cached layers and finishes in seconds. |
| Port 8000 / 3001 in use | Stop other services or edit compose ports |
| Dashboard empty after demo | Login → **Open my dashboard →** → agent **support-bot** |
| `zizkadb demo` fails | Ensure API healthy: `curl http://localhost:8000/health` |

---

## API key shows "Never used"

No successful authenticated request reached the API.

| Check | Action |
|-------|--------|
| Wrong env var name | Use `ZIZKADB_API_KEY` or `AGENTDB_API_KEY`, not `API=` |
| Space in key | Re-paste as one continuous line |
| Wrong URL | Must be `https://db.zizka.ai/v1/events` not `/v1_` |
| Placeholder in curl | Use real key, not `YOUR_KEY` |
| Revoked key | Create new key on agent page |

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

## Self-hosted key sent to the wrong host

A key created via `http://localhost:8000` (self-hosted dashboard/signup) only exists in
that instance's Postgres — it authenticates against `localhost:8000`, never against
`https://db.zizka.ai`. If your app only sets `ZIZKADB_API_KEY` and not `ZIZKADB_HOST`,
most SDK clients default to the cloud host and every request 401s.

**Fix:** set both env vars for a self-hosted target — `ZIZKADB_HOST=http://localhost:8000`
*and* `ZIZKADB_API_KEY=zizkadb_live_...`. Verify quickly:

```bash
curl -s http://localhost:8000/v1/agents -H "Authorization: Bearer <key>"
```

200 with a JSON agent list confirms the key is valid on that host, and shows which agent
name(s) it's scoped to — use that exact name for `ZIZKADB_AGENT_NAME` / `agent=` (see
"HTTP 403 Agent mismatch" above).

---

## Dashboard empty but curl works

| Cause | Fix |
|-------|-----|
| Viewing wrong agent | Open the agent name your code uses |
| Settings test event | Goes to `dashboard-connection-test`, not your agent |
| Different tenant | SDK key and dashboard login must be same account |
| Self-host dev login vs email login | Use same auth path |

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
