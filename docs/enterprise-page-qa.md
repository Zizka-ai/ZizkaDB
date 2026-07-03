# Enterprise page — production QA checklist

Use this checklist before merging or after deploying `/enterprise` and related backend changes.

## Automated gates

Run from repo root:

```bash
cd dashboard && npm run lint && npm run build
cd ../core && pytest tests/test_demo_requests.py tests/test_rate_limiting.py::TestDemoRequestsRateLimiting -q
```

Copy guardrails (must return no matches except explicit negations):

```bash
rg -i 'SOC 2|HIPAA|SAML|SCIM|PagerDuty|Slack alert|SLA guarantee|detects hallucination' \
  dashboard/components/marketing/enterprise dashboard/app/enterprise
```

## Manual smoke (~5 min)

- [ ] `/enterprise` — all sections render in order: Hero → What is → Fleet → Capabilities → Tier compare → VPC deploy → Platform → FAQ → Connect form → Resources
- [ ] Nav highlights **Enterprise** on desktop and mobile
- [ ] **Let's connect** scrolls to `#connect` and focuses first name field
- [ ] Submit connect form → **201**; admin demo requests tab shows `source=enterprise` and role when filled
- [ ] Invalid `source` rejected server-side (422) — covered by pytest
- [ ] **Book demo** opens Calendly modal; **ESC** closes
- [ ] Mobile **375px**: nav CTA row visible, no horizontal overflow
- [ ] All `TECHNICAL_LINKS` in resources strip resolve (no 404)
- [ ] Trust `#limits` shows Enterprise row; landing `#pricing` links to `/enterprise`
- [ ] `/trust`, `/docs`, `/community` show shared marketing footer with Enterprise link

## Rate limiting note

Demo request rate limits use the same in-memory pattern as auth OTP and community posts (`core/api/demo_requests.py`). In multi-worker deployments, effective limit is multiplied by worker count — consistent with the rest of the API today.

## Lead form contract

- Frontend: `EnterpriseConnectForm` sends `source: 'enterprise'` via `submitDemoRequest`; honeypot field is `botcheck` (off-screen)
- Backend: `POST /v1/demo-requests` stores optional `position`, allowlisted `source`, client IP
- Admin: search includes name, email, company, website, role, source
