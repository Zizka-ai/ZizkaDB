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
| POST | `/v1/auth/request-otp` | Send OTP — body `{email, intent:"login"|"signup"}`. Login returns **404** if email unknown; signup returns **409** if already registered. |
| POST | `/v1/auth/verify-otp` | Get JWT — body `{email, otp, intent:"login"|"signup", gdpr_consent?, marketing_consent?}`. Login only works for existing users; signup requires `gdpr_consent:true` for new accounts. |
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
| 422 | Validation error (e.g. invalid demo request source) |
| 429 | Rate limit exceeded |

## Demo requests (public, no auth)

Landing **Book demo** and Enterprise **Let's connect** forms.

```http
POST /v1/demo-requests
Content-Type: application/json

{
  "first_name": "Ada",
  "last_name": "Lovelace",
  "email": "ada@example.com",
  "company_name": "Example Corp",
  "website": "https://example.com",
  "position": "Head of Platform",
  "source": "enterprise",
  "botcheck": ""
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `first_name`, `last_name`, `email`, `company_name`, `website` | yes | Trimmed server-side |
| `position` | no | Role/title (max 120 chars) |
| `source` | no | Allowlist: `enterprise`, `landing`, `newsletter` — invalid → **422** |
| `botcheck` | no | Honeypot; non-empty → **400** |

Response **201:** `{ "id": "<uuid>", "created_at": "<iso>" }`. Rate limit: 8 requests / hour / IP (**429**). Admin list: `GET /v1/admin/demo-requests` (JWT, founder OTP).
