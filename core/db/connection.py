import asyncpg
import redis.asyncio as redis
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams
import os
import logging

logger = logging.getLogger(__name__)

# Global connection holders
_pg_pool: asyncpg.Pool | None = None
_redis: redis.Redis | None = None
_qdrant: AsyncQdrantClient | None = None

QDRANT_COLLECTION = "agent_events"
VECTOR_SIZE = 1536  # OpenAI text-embedding-3-small


async def init_db():
    global _pg_pool, _redis, _qdrant

    _pg_pool = await asyncpg.create_pool(
        dsn=os.getenv("DATABASE_URL"),
        min_size=2,
        max_size=20,
    )
    logger.info("Postgres connected")

    try:
        user_count = await _pg_pool.fetchval(
            "SELECT COUNT(*) FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = 'users'"
        )
        if user_count:
            n = await _pg_pool.fetchval("SELECT COUNT(*) FROM users")
            logger.info("Postgres users table: %s rows", n)
        else:
            logger.warning(
                "Postgres schema incomplete (users table missing). "
                "Do NOT run 'docker compose down -v' on production — restore from infra/backups/."
            )
    except Exception as e:
        logger.warning("Could not read user count at startup: %s", e)

    # Billing columns for admin subscriber view (idempotent)
    await _pg_pool.execute("""
        ALTER TABLE users ADD COLUMN IF NOT EXISTS plan VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
        ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);
    """)
    await _pg_pool.execute("""
        UPDATE users
        SET plan = 'pro',
            subscription_status = 'trialing',
            trial_ends_at = COALESCE(trial_ends_at, created_at + INTERVAL '30 days')
        WHERE plan IS NULL OR subscription_status IS NULL
    """)

    # Restore dashboard access for users blocked by Stripe checkout rollout (no data deleted)
    restored = await _pg_pool.execute(
        """
        UPDATE users
        SET subscription_status = 'trialing',
            plan = COALESCE(plan, 'pro'),
            trial_ends_at = COALESCE(trial_ends_at, NOW() + INTERVAL '30 days')
        WHERE stripe_subscription_id IS NULL
          AND subscription_status IN (
            'pending_checkout', 'past_due', 'unpaid', 'incomplete', 'incomplete_expired'
          )
        """
    )
    if restored and restored != "UPDATE 0":
        logger.info("Restored local trial access after Stripe rollback: %s", restored)

    await _pg_pool.execute("""
        CREATE TABLE IF NOT EXISTS community_posts (
            post_id       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            author_name   VARCHAR(120) NOT NULL,
            author_email  VARCHAR(255),
            category      VARCHAR(32) NOT NULL DEFAULT 'question',
            title         VARCHAR(300) NOT NULL,
            body          TEXT NOT NULL,
            image_urls    JSONB NOT NULL DEFAULT '[]'::jsonb,
            reply_count   INTEGER NOT NULL DEFAULT 0,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS community_replies (
            reply_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            post_id       UUID NOT NULL REFERENCES community_posts(post_id) ON DELETE CASCADE,
            author_name   VARCHAR(120) NOT NULL,
            author_email  VARCHAR(255),
            body          TEXT NOT NULL,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    """)

    await _pg_pool.execute("""
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS embedding_provider VARCHAR(32) NOT NULL DEFAULT 'openai';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(64) NOT NULL DEFAULT 'text-embedding-3-small';
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS embedding_use_platform_key BOOLEAN NOT NULL DEFAULT TRUE;
        ALTER TABLE tenants ADD COLUMN IF NOT EXISTS embedding_api_key_encrypted TEXT;
    """)

    await _pg_pool.execute("""
        ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS agent_id VARCHAR(255);
    """)
    await _pg_pool.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_api_keys_agent'
            ) THEN
                ALTER TABLE api_keys
                    ADD CONSTRAINT fk_api_keys_agent
                    FOREIGN KEY (agent_id, tenant_id)
                    REFERENCES agents (agent_id, tenant_id)
                    ON DELETE CASCADE;
            END IF;
        END $$;
    """)
    await _pg_pool.execute("""
        CREATE INDEX IF NOT EXISTS idx_api_keys_agent
        ON api_keys (tenant_id, agent_id) WHERE revoked = FALSE;
    """)

    await _pg_pool.execute("""
        CREATE TABLE IF NOT EXISTS sdk_telemetry (
            install_id   TEXT PRIMARY KEY,
            sdk          TEXT    NOT NULL DEFAULT 'unknown',
            sdk_version  TEXT    NOT NULL DEFAULT 'unknown',
            runtime      TEXT    NOT NULL DEFAULT 'unknown',
            os           TEXT    NOT NULL DEFAULT 'unknown',
            mode         TEXT    NOT NULL DEFAULT 'cloud',
            first_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            ping_count   INTEGER NOT NULL DEFAULT 1
        )
    """)

    await _pg_pool.execute("""
        CREATE TABLE IF NOT EXISTS demo_requests (
            request_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            first_name    VARCHAR(80) NOT NULL,
            last_name     VARCHAR(80) NOT NULL,
            company_name  VARCHAR(255) NOT NULL,
            website       VARCHAR(500) NOT NULL,
            ip_address    VARCHAR(64),
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_demo_requests_created
            ON demo_requests (created_at DESC);
    """)

    await _pg_pool.execute("""
        ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS email VARCHAR(255) NOT NULL DEFAULT '';
        ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS position VARCHAR(120);
        ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS source VARCHAR(64);
    """)

    await _pg_pool.execute("""
        CREATE TABLE IF NOT EXISTS marketing_events (
            event_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            visitor_id  TEXT NOT NULL,
            session_id  TEXT,
            event_type  VARCHAR(64) NOT NULL,
            segment     VARCHAR(32),
            page_path   VARCHAR(512),
            payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
            ip_address  VARCHAR(64),
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_marketing_events_created
            ON marketing_events (created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_marketing_events_visitor
            ON marketing_events (visitor_id);
    """)

    _redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))
    logger.info("Redis connected")

    _qdrant = AsyncQdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))
    await _ensure_qdrant_collection()
    logger.info("Qdrant connected")


async def _ensure_qdrant_collection():
    collections = await _qdrant.get_collections()
    names = [c.name for c in collections.collections]

    if QDRANT_COLLECTION not in names:
        await _qdrant.create_collection(
            collection_name=QDRANT_COLLECTION,
            vectors_config=VectorParams(
                size=VECTOR_SIZE,
                distance=Distance.COSINE,
            ),
        )
        logger.info(f"Qdrant collection '{QDRANT_COLLECTION}' created")


async def close_db():
    if _pg_pool:
        await _pg_pool.close()
    if _redis:
        await _redis.aclose()
    if _qdrant:
        await _qdrant.close()


def get_pool() -> asyncpg.Pool:
    if not _pg_pool:
        raise RuntimeError("Database not initialized")
    return _pg_pool


def get_redis() -> redis.Redis:
    if not _redis:
        raise RuntimeError("Redis not initialized")
    return _redis


def get_qdrant() -> AsyncQdrantClient:
    if not _qdrant:
        raise RuntimeError("Qdrant not initialized")
    return _qdrant


async def check_postgres() -> dict:
    try:
        await get_pool().fetchval("SELECT 1")
        return {"ok": True}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


async def check_redis() -> dict:
    try:
        pong = await get_redis().ping()
        return {"ok": bool(pong)}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}


async def check_qdrant() -> dict:
    try:
        collections = await get_qdrant().get_collections()
        names = [collection.name for collection in collections.collections]
        return {"ok": True, "collections": names}
    except Exception as exc:
        return {"ok": False, "error": str(exc)}
