# ZizkaDB cloud vs product

| Repo | Visibility | Purpose |
|------|------------|---------|
| [Zizka-ai/ZizkaDB](https://github.com/Zizka-ai/ZizkaDB) | **Public** | Product runtime: API, self-host dashboard, SDKs, MCP, examples |
| [Zizka-ai/zizkadb-cloud](https://github.com/Zizka-ai/zizkadb-cloud) | **Private** | Managed cloud: marketing site, `/admin`, outreach, leads, production deploy |

Public clones and all GitHub / website “Star on GitHub” links must use **ZizkaDB** only.

EC2 (`db.zizka.ai`) should deploy from **zizkadb-cloud**, not from the slim public tree.

When merging OSS product changes into cloud, take only `/dashboard/*` product routes, core API/services, and tests. **Do not** replace cloud marketing pages (`/`, `/signup`, `/enterprise`, `/admin`), `infra/nginx.conf`, or `infra/deploy-dashboard.sh`.
