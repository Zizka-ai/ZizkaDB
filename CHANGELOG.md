# Changelog

All notable changes to ZizkaDB are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Security
- Fix OTP plaintext logging in production when SMTP is unconfigured — now raises instead of logging the code
- Fix CORS wildcard + credentials combination (`allow_origins=["*"]` with `allow_credentials=True` is invalid and was silently rejected by all browsers); origins now read from `CORS_ORIGINS`
- Fix user enumeration in `POST /v1/auth/request-otp` — existing vs. non-existing emails no longer produce distinguishable responses (was 409 vs 404)
- Add `restart: unless-stopped` to every Docker Compose service
- Bind Postgres, Qdrant, and Redis ports to `127.0.0.1` instead of `0.0.0.0`
- Fix `infra/deploy-production.sh` to poll `/health/deep` (real dependency check) instead of `/health` (always 200)
- Add `NEXT_PUBLIC_DEV_MODE=true` production deploy guard to `infra/deploy-production.sh`
- Add non-root `USER` to `core/Dockerfile` and a `core/.dockerignore`
- Fix `client_ip()` to only trust `X-Forwarded-For` from a configured trusted proxy, preventing IP-spoofing bypass of rate limits
- Add startup guard refusing to boot if `DEV_API_KEY` is set while `ENV=production`; remove the `DEV_API_KEY` compose default that could silently re-enable the dev auth bypass
- Remove redundant `docker compose restart api` step in the deploy script

## [0.1.0] - 2024-01-01

### Added
- Initial public release
