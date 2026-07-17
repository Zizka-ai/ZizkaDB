"""
GitHub Developer Leads finder.

Finds public emails for developers who starred or contributed to repos
matching interest keywords. Geography via profile location. Hard cap 100/day.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
from dataclasses import dataclass
from typing import Optional

import httpx

from services.leads_countries import location_matches_country

log = logging.getLogger(__name__)

DEFAULT_KEYWORDS = "agent,agents,mcp,langchain,crewai,llm"
DAILY_LEAD_LIMIT = int(os.getenv("LEADS_DAILY_LIMIT", "100"))
GITHUB_API = "https://api.github.com"


@dataclass
class LeadCandidate:
    github_username: str
    email: str
    name: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    profile_url: str
    match_reason: str
    matched_keyword: str
    matched_repo: Optional[str]
    signal: str  # star | contribution


def github_token() -> Optional[str]:
    return (os.getenv("GITHUB_LEADS_TOKEN") or os.getenv("GITHUB_TOKEN") or "").strip() or None


def parse_keywords(raw: str) -> list[str]:
    parts = re.split(r"[,;\s]+", (raw or "").strip().lower())
    out: list[str] = []
    seen: set[str] = set()
    for p in parts:
        p = p.strip()
        if not p or p in seen:
            continue
        seen.add(p)
        out.append(p)
    return out or parse_keywords(DEFAULT_KEYWORDS)


class GitHubLeadsClient:
    def __init__(self, token: str):
        self.token = token
        self._client: Optional[httpx.AsyncClient] = None

    async def __aenter__(self) -> "GitHubLeadsClient":
        self._client = httpx.AsyncClient(
            base_url=GITHUB_API,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ZizkaDB-DeveloperLeads",
            },
            timeout=30.0,
        )
        return self

    async def __aexit__(self, *args) -> None:
        if self._client:
            await self._client.aclose()

    async def _get(self, path: str, params: Optional[dict] = None) -> httpx.Response:
        assert self._client
        # gentle pacing for search / core API
        await asyncio.sleep(0.35)
        resp = await self._client.get(path, params=params or {})
        if resp.status_code == 403 and "rate limit" in resp.text.lower():
            raise RuntimeError("GitHub API rate limit hit. Try again later.")
        if resp.status_code == 401:
            raise RuntimeError("GitHub token invalid. Check GITHUB_LEADS_TOKEN.")
        resp.raise_for_status()
        return resp

    async def search_repos(self, keyword: str, per_page: int = 5) -> list[dict]:
        # Prefer topic match, fall back to text search
        queries = [
            f"topic:{keyword} stars:>20",
            f"{keyword} in:name,description,topics stars:>50",
        ]
        repos: list[dict] = []
        seen: set[str] = set()
        for q in queries:
            try:
                resp = await self._get(
                    "/search/repositories",
                    {"q": q, "sort": "stars", "order": "desc", "per_page": per_page},
                )
            except httpx.HTTPStatusError as exc:
                if exc.response is not None and exc.response.status_code == 422:
                    continue
                raise
            for item in resp.json().get("items") or []:
                full = item.get("full_name")
                if full and full not in seen:
                    seen.add(full)
                    repos.append(item)
            if len(repos) >= per_page:
                break
        return repos[:per_page]

    async def repo_contributors(self, full_name: str, per_page: int = 30) -> list[str]:
        owner, repo = full_name.split("/", 1)
        try:
            resp = await self._get(
                f"/repos/{owner}/{repo}/contributors",
                {"per_page": per_page, "anon": "false"},
            )
        except httpx.HTTPStatusError:
            return []
        logins = []
        for u in resp.json() or []:
            login = u.get("login")
            if login and u.get("type") == "User":
                logins.append(login)
        return logins

    async def repo_stargazers(self, full_name: str, per_page: int = 30) -> list[str]:
        owner, repo = full_name.split("/", 1)
        assert self._client
        await asyncio.sleep(0.35)
        resp = await self._client.get(
            f"/repos/{owner}/{repo}/stargazers",
            params={"per_page": per_page},
            headers={
                "Authorization": f"Bearer {self.token}",
                "Accept": "application/vnd.github.star+json",
                "X-GitHub-Api-Version": "2022-11-28",
                "User-Agent": "ZizkaDB-DeveloperLeads",
            },
        )
        if resp.status_code >= 400:
            return []
        logins = []
        for row in resp.json() or []:
            user = row.get("user") if isinstance(row, dict) and "user" in row else row
            if not isinstance(user, dict):
                continue
            login = user.get("login")
            if login and user.get("type", "User") == "User":
                logins.append(login)
        return logins

    async def get_user(self, login: str) -> Optional[dict]:
        try:
            resp = await self._get(f"/users/{login}")
        except httpx.HTTPStatusError:
            return None
        return resp.json()


async def find_public_leads(
    *,
    keywords: list[str],
    country_code: str,
    exclude_emails: set[str],
    exclude_usernames: set[str],
    limit: int,
) -> tuple[list[LeadCandidate], dict]:
    """
    Discover up to `limit` new public-email leads.
    Returns (candidates, meta).
    """
    token = github_token()
    if not token:
        raise RuntimeError(
            "GITHUB_LEADS_TOKEN is not set. Add a read-only GitHub token on the API host."
        )
    if limit <= 0:
        return [], {"repos_scanned": 0, "users_checked": 0, "skipped_no_email": 0}

    found: list[LeadCandidate] = []
    seen_emails = {e.lower() for e in exclude_emails}
    seen_users = {u.lower() for u in exclude_usernames}
    queued_users: dict[str, tuple[str, str, str]] = {}  # login -> (signal, keyword, repo)

    repos_scanned = 0
    users_checked = 0
    skipped_no_email = 0

    async with GitHubLeadsClient(token) as gh:
        for kw in keywords:
            if len(found) >= limit:
                break
            repos = await gh.search_repos(kw, per_page=4)
            for repo in repos:
                if len(found) >= limit:
                    break
                full = repo.get("full_name")
                if not full:
                    continue
                repos_scanned += 1
                contributors = await gh.repo_contributors(full, per_page=25)
                for login in contributors:
                    key = login.lower()
                    if key not in seen_users and key not in queued_users:
                        queued_users[key] = ("contribution", kw, full)
                stargazers = await gh.repo_stargazers(full, per_page=25)
                for login in stargazers:
                    key = login.lower()
                    if key not in seen_users and key not in queued_users:
                        queued_users[key] = ("star", kw, full)

        # Process queued users until we hit limit
        for login_key, (signal, kw, repo) in list(queued_users.items()):
            if len(found) >= limit:
                break
            if login_key in seen_users:
                continue
            user = await gh.get_user(login_key)
            users_checked += 1
            if not user:
                continue
            email = (user.get("email") or "").strip()
            if not email or "@" not in email:
                skipped_no_email += 1
                continue
            email_l = email.lower()
            if email_l in seen_emails:
                continue
            if not location_matches_country(user.get("location"), country_code):
                continue

            login = user.get("login") or login_key
            found.append(
                LeadCandidate(
                    github_username=login,
                    email=email_l,
                    name=(user.get("name") or "").strip() or None,
                    bio=(user.get("bio") or "").strip() or None,
                    location=(user.get("location") or "").strip() or None,
                    profile_url=user.get("html_url") or f"https://github.com/{login}",
                    match_reason=f"{signal} on {repo} (keyword: {kw})",
                    matched_keyword=kw,
                    matched_repo=repo,
                    signal=signal,
                )
            )
            seen_emails.add(email_l)
            seen_users.add(login.lower())

    meta = {
        "repos_scanned": repos_scanned,
        "users_checked": users_checked,
        "skipped_no_email": skipped_no_email,
        "queued_users": len(queued_users),
        "found": len(found),
    }
    return found, meta
