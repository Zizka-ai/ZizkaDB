"""Dashboard settings — embedding provider/model (managed cloud)."""

from fastapi import APIRouter, Depends
from services.exceptions import bad_request
from pydantic import BaseModel, Field

from api.deps import dashboard_session_dependency, get_tenant
from services.embedding_config import (
    embedding_config_for_response,
    get_tenant_embedding_config,
    list_catalog,
    update_tenant_embedding_config,
)

router = APIRouter()

# JWT only — API keys cannot change tenant embedding settings.
require_dashboard_session = dashboard_session_dependency(
    "Sign in to the dashboard to manage embedding settings"
)


class UpdateEmbeddingsBody(BaseModel):
    provider: str = Field(default="openai", max_length=32)
    model: str = Field(default="text-embedding-3-small", max_length=64)
    use_platform_key: bool = True
    api_key: str | None = Field(default=None, description="Required when use_platform_key is false")


@router.get("/embeddings/catalog")
async def embeddings_catalog():
    """Public list of supported embedding models (1536-dim v1)."""
    return list_catalog()


@router.get("/embeddings")
async def get_embeddings(tenant: dict = Depends(get_tenant)):
    config = await get_tenant_embedding_config(tenant["tenant_id"])
    return embedding_config_for_response(config)


@router.put("/embeddings")
async def put_embeddings(
    body: UpdateEmbeddingsBody,
    tenant: dict = Depends(require_dashboard_session),
):
    try:
        config = await update_tenant_embedding_config(
            tenant["tenant_id"],
            provider=body.provider,
            model=body.model,
            use_platform_key=body.use_platform_key,
            api_key=body.api_key,
        )
    except ValueError as e:
        raise bad_request(str(e))

    out = embedding_config_for_response(config)
    if not out["ready"]:
        raise bad_request(
            "Embedding not configured. Use platform key or provide a valid API key."
        )
    return {**out, "message": "Embedding settings saved. New events will use this model."}
