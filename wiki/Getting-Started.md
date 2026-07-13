# Getting Started

## Managed cloud (recommended)

### 1. Sign up

Go to [db.zizka.ai/signup](https://db.zizka.ai/signup) → enter email → verify OTP code.

### 2. Create an agent + API key

1. Open [Dashboard → Agents](https://db.zizka.ai/dashboard)
2. Enter an agent id (e.g. `support-bot`, `my-cursor-agent`)
3. Click **Create**
4. **Copy the full API key** — shown once only (`zizkadb_live_...`)

### 3. Configure your environment

```bash
export ZIZKADB_API_KEY=zizkadb_live_...
export ZIZKADB_AGENT=support-bot    # must match the agent you created
# Legacy alias still works:
# export AGENTDB_API_KEY=zizkadb_live_...
# Self-host:
# export ZIZKADB_HOST=http://localhost:8000
# Optional:
# export ZIZKADB_TELEMETRY=false
```

### 4. Log your first event

**Python:**

```bash
pip install zizkadb-sdk
```

```python
import asyncio
from zizkadb import ZizkaDB

async def main():
    async with ZizkaDB() as db:  # reads ZIZKADB_API_KEY from env
        result = await db.log(
            agent="support-bot",
            event="connection_test",
            data={"ok": True},
        )
        print(result.event_id)

asyncio.run(main())
```

**curl:**

```bash
curl -s -w "\nHTTP %{http_code}\n" \
  -H "Authorization: Bearer $ZIZKADB_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"agent":"support-bot","event":"test","data":{"ok":true}}' \
  https://db.zizka.ai/v1/events
```

Expect **HTTP 201**.

### 5. Verify in dashboard

- Open your agent on the dashboard
- Click **Test agent** (logs via dashboard session)
- Or refresh **Events** tab after your SDK/curl call
- API key should show **Last used**

---

## Self-host (local, ~30 seconds)

```bash
git clone https://github.com/Zizka-ai/ZizkaDB.git && cd ZizkaDB
bash scripts/setup-local.sh
```

| Service | URL |
|---------|-----|
| API health | http://localhost:8000/health |
| Swagger | http://localhost:8000/swagger |
| Dashboard | http://localhost:3001/login → **Open my dashboard →** |

Local dev uses auto-injected dev key — no signup required.

---

## Golden rule

> **The `agent` name in your code must match the agent you created in the dashboard** (unless you use a tenant-wide key — see [[Multi-Agent Apps]]).
