import os
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from services.auth import verify_api_key, decode_access_token

bearer = HTTPBearer()

# Dev key: set DEV_API_KEY in .env for self-hosted local development.
# Any request with this token is accepted without a DB lookup.
# Never set this in production managed cloud.
_DEV_API_KEY = os.getenv("DEV_API_KEY", "")
_IS_PRODUCTION = os.getenv("ENV", "development") == "production"
# SDK/MCP default vs legacy self-host .env — accept both in local dev only.
_KNOWN_DEV_KEYS = frozenset({"zizkadb_dev_local", "agdb_dev_local"})

# Same IDs as /v1/auth/dev-token (core/api/auth.py)
_DEV_TENANT_ID = "00000000-0000-0000-0000-000000000001"
_DEV_USER_ID = "00000000-0000-0000-0000-000000000001"

_DEV_TENANT = {
    "tenant_id": _DEV_TENANT_ID,
    "user_id": _DEV_USER_ID,
}


def looks_like_jwt(token: str) -> bool:
    """JWTs use three dot-separated segments; API keys do not."""
    return token.count(".") == 2


async def resolve_api_key_tenant(token: str) -> dict | None:
    """Verify API key by hash.

    Works for every key ever issued on managed cloud, including legacy
    ``agdb_live_...`` keys from the AgentDB era and new ``zizkadb_live_...``
    keys. Prefix is not checked — only the SHA-256 hash in ``api_keys``.
    """
    if looks_like_jwt(token):
        return None
    return await verify_api_key(token)


def assert_agent_allowed(tenant: dict, agent_id: str) -> None:
    """Agent-scoped API keys may only access their bound agent."""
    scoped = tenant.get("agent_id")
    if scoped and scoped != agent_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"This API key is scoped to agent '{scoped}' only, but the request used "
                f"'{agent_id}'. Use agent='{scoped}' in db.log() / POST /v1/events, or create "
                f"a separate agent + key for '{agent_id}'."
            ),
        )


def _dev_key_accepted(token: str) -> bool:
    if _IS_PRODUCTION:
        return False
    if _DEV_API_KEY:
        if token == _DEV_API_KEY:
            return True
        # Transition: old infra/.env used agdb_dev_local; SDK/MCP use zizkadb_dev_local.
        if _DEV_API_KEY in _KNOWN_DEV_KEYS and token in _KNOWN_DEV_KEYS:
            return True
        return False
    return token in _KNOWN_DEV_KEYS


def dashboard_session_dependency(forbid_detail: str):
    """Build a JWT-only FastAPI dependency for dashboard-managed actions.

    Rejects API-key auth so a scoped agent key cannot perform dashboard-only
    actions (e.g. minting new keys), and guarantees a ``user_id``/plan context.
    ``forbid_detail`` is the 403 message shown when an API key is used instead of
    a dashboard session. Returns a dependency that yields ``{tenant_id, user_id}``.

    Single implementation reused by every JWT-only router (auth, agents, account,
    settings) so the auth logic can never drift between them.
    """

    async def _require_dashboard_session(
        credentials: HTTPAuthorizationCredentials = Security(bearer),
    ) -> dict:
        token = credentials.credentials
        if await resolve_api_key_tenant(token):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=forbid_detail,
            )
        try:
            payload = decode_access_token(token)
            return {
                "tenant_id": payload["tenant_id"],
                "user_id": payload["sub"],
            }
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )

    return _require_dashboard_session


# Default dependency for API-key management routes (auth, agents).
require_dashboard_session = dashboard_session_dependency(
    "Sign in to the dashboard to manage API keys"
)


async def get_tenant(
    credentials: HTTPAuthorizationCredentials = Security(bearer),
) -> dict:
    """Validate API key or JWT and return tenant context."""
    token = credentials.credentials

    # Dev key bypass (self-hosted local development only)
    if _dev_key_accepted(token):
        return _DEV_TENANT

    # API key (verified by hash, not prefix)
    tenant = await resolve_api_key_tenant(token)
    if tenant:
        return tenant

    if not looks_like_jwt(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    # JWT (dashboard sessions)
    try:
        payload = decode_access_token(token)
        return {
            "tenant_id": payload["tenant_id"],
            "user_id": payload["sub"],
        }
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
