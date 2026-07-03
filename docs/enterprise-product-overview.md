# ZizkaDB Enterprise — Product Overview

Internal reference for the `/enterprise` marketing page. **This is marketing + lead capture**, not the Enterprise product codebase.

## What we sell

**Model A — Licensed VPC deployment:** ZizkaDB Core + Postgres + Qdrant + Redis run in the customer's cloud (single-tenant). Commercial license replaces AGPL obligations for internal use. Week-1 install package includes supported docker-compose, env template, and onboarding call.

## What exists today (honest)

| Capability | Public cloud (Pro/Team) | Enterprise VPC |
|------------|-------------------------|----------------|
| Event logging, causal `why()`, time travel | ✓ | ✓ |
| Semantic search, drift baselines | ✓ | ✓ |
| Fleet dashboard UI | — | ✓ (customer VPC) |
| Audit export bundle | — | ✓ (customer VPC) |
| Data residency | Zizka cloud | Customer VPC |
| Commercial license | — | ✓ |

## What is NOT shipped (do not claim)

- SOC 2, HIPAA, formal DPAs
- SSO / SAML / SCIM (roadmap only)
- Slack / PagerDuty alerting integrations
- SLA guarantees
- Hallucination **detection** (drift = operational behavior change)

## Lead flow

1. Visitor submits **Let's connect** on `/enterprise#connect`
2. `POST /v1/demo-requests` with `source=enterprise`, optional `position`
3. Admin → Demo requests tab shows source + role; founder follows up manually

## Related docs

- QA checklist: `docs/enterprise-page-qa.md`
- Agent rule: `.cursor/rules/enterprise-page-knowledge-base.mdc`
- Copy strings: `dashboard/components/marketing/enterprise/enterprise-copy.ts`
