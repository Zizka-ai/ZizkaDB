# REST API

**Base URL:** `https://db.zizka.ai`  
**Prefix:** `/v1/...`  
**Auth:** `Authorization: Bearer <api_key>` or dashboard JWT  
**Explorer:** [db.zizka.ai/swagger](https://db.zizka.ai/swagger)

## Log event

```http
POST /v1/events
Content-Type: application/json
Authorization: Bearer zizkadb_live_...

{
  "agent": "my-bot",
  "event": "user_message",
  "data": { "text": "hello" },
  "parent_id": null,
  "session_id": "sess_001"
}
```

Response **201:**

```json
{
  "event_id": "...",
  "timestamp": "...",
  "sequence_no": 112,
  "checksum": "..."
}
```

## Query events

```http
GET /v1/events?agent=my-bot&limit=50
Authorization: Bearer ...
```

## Semantic search

```http
POST /v1/search
{"query": "billing errors", "agent": "my-bot", "limit": 10}
```

## Why (causal chain)

```http
GET /v1/events/{event_id}/why?depth=10
```

## Agents

| Method | Path | Description |
|--------|------|-------------|
| GET | `/v1/agents` | List agents |
| POST | `/v1/agents` | Create agent + first key (dashboard JWT only) |
| DELETE | `/v1/agents/{id}` | Delete agent + events + keys |
| POST | `/v1/agents/{id}/test-event` | Dashboard test (JWT) |
| GET | `/v1/agents/{id}/api-keys` | List keys |
| POST | `/v1/agents/{id}/api-keys` | Create key (dashboard JWT only) |
| DELETE | `/v1/agents/{id}/api-keys/{key_id}` | Revoke key |

## Auth / keys

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/auth/request-otp` | Login OTP |
| POST | `/v1/auth/verify-otp` | Get JWT |
| POST | `/v1/auth/api-keys` | Tenant-wide key (dashboard JWT only) |
| GET | `/v1/auth/api-keys` | List all keys |
| GET | `/v1/auth/api-keys/usage` | Plan key quota `{plan, limit, used, unlimited, at_limit}` |
| DELETE | `/v1/auth/api-keys/{id}` | Revoke key |

**API key creation** requires a dashboard login session (JWT), not an API key. Active keys per tenant are limited by plan (Pro 3, Team 10; self-host/other unlimited); exceeding the limit returns `409` with `{detail:{code:"api_key_limit_reached", plan, limit, used}}`. Enforcement is gated by the `API_KEY_LIMITS_ENFORCED` server flag.

## Health

```http
GET /health
→ {"status":"ok","version":"0.1.0"}
```

## Common status codes

| Code | Meaning |
|------|---------|
| 201 | Event created |
| 401 | Invalid/revoked API key |
| 403 | Agent-scoped key used with wrong agent name |
| 404 | Agent or event not found |
