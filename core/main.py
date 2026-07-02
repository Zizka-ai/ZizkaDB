from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from contextlib import asynccontextmanager
import logging
import os

from db.connection import init_db, close_db, get_pool
from api.auth import _ensure_dev_tenant
from api.events import router as events_router
from api.agents import router as agents_router
from api.auth import router as auth_router
from api.search import router as search_router
from api.memory import router as memory_router
from api.telemetry import router as telemetry_router
from api.admin import router as admin_router
from api.stats import router as stats_router
from api.billing_checkout import router as billing_checkout_router
from api.community import router as community_router
from api.demo_requests import router as demo_requests_router
from api.settings import router as settings_router
from api.account import router as account_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    # Seed dev tenant for local self-host (ENV=development) or when DEV_API_KEY is set.
    if os.getenv("ENV", "development") == "development" or os.getenv("DEV_API_KEY"):
        await _ensure_dev_tenant(get_pool())
    logger.info("ZizkaDB started")
    yield
    await close_db()
    logger.info("ZizkaDB stopped")


app = FastAPI(
    title="ZizkaDB",
    description="The operational database for AI agents",
    version="0.1.0",
    lifespan=lifespan,
    # /swagger avoids nginx location /api/ rewriting /api-explorer → /v1/explorer
    docs_url="/swagger",
    redoc_url=None,
    openapi_url="/openapi.json",
)


@app.get("/api-explorer", include_in_schema=False)
async def api_explorer_redirect():
    """Legacy URL; nginx may mis-route this unless ^~ /api-explorer is configured."""
    return RedirectResponse(url="/swagger")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router,      prefix="/v1/auth",      tags=["auth"])
app.include_router(events_router,    prefix="/v1/events",    tags=["events"])
app.include_router(agents_router,    prefix="/v1/agents",    tags=["agents"])
app.include_router(search_router,    prefix="/v1/search",    tags=["search"])
app.include_router(memory_router,    prefix="/v1/memory",    tags=["memory"])
app.include_router(telemetry_router, prefix="/v1/telemetry", tags=["telemetry"])
app.include_router(admin_router,     prefix="/v1/admin",     include_in_schema=False)
app.include_router(stats_router,     prefix="/v1/stats",     tags=["stats"])
app.include_router(billing_checkout_router, prefix="/v1/billing", tags=["billing"])
app.include_router(community_router, prefix="/v1/community", tags=["community"])
app.include_router(demo_requests_router, prefix="/v1/demo-requests", tags=["demo"])
app.include_router(settings_router,  prefix="/v1/settings",  tags=["settings"])
app.include_router(account_router,   prefix="/v1/account",   tags=["account"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
