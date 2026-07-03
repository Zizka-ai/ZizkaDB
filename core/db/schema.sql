-- ZizkaDB Schema
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- TENANTS (one per project/API key)
-- ─────────────────────────────────────────
CREATE TABLE tenants (
    tenant_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- AGENTS
-- ─────────────────────────────────────────
CREATE TABLE agents (
    agent_id    VARCHAR(255) NOT NULL,
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    first_seen  TIMESTAMPTZ DEFAULT NOW(),
    last_seen   TIMESTAMPTZ DEFAULT NOW(),
    event_count BIGINT DEFAULT 0,
    metadata    JSONB,
    PRIMARY KEY (agent_id, tenant_id)
);

CREATE INDEX idx_agents_tenant ON agents (tenant_id, last_seen DESC);

-- ─────────────────────────────────────────
-- API KEYS
-- ─────────────────────────────────────────
CREATE TABLE api_keys (
    key_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id    VARCHAR(255),  -- NULL = legacy tenant-wide key; set = scoped to one agent
    key_hash    VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hashed
    key_prefix  VARCHAR(24) NOT NULL,           -- e.g. "zizkadb_live_xxxx" for display
    name        VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_used   TIMESTAMPTZ,
    revoked     BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_api_keys_agent FOREIGN KEY (agent_id, tenant_id)
        REFERENCES agents (agent_id, tenant_id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);

-- ─────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────
CREATE TABLE users (
    user_id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    tenant_id               UUID REFERENCES tenants(tenant_id),
    plan                    VARCHAR(50),   -- pro | team | starter
    subscription_status     VARCHAR(50),   -- trialing | active | past_due | canceled
    trial_ends_at           TIMESTAMPTZ,
    stripe_customer_id      VARCHAR(255) UNIQUE,
    stripe_subscription_id  VARCHAR(255) UNIQUE,
    retention_trial_used    BOOLEAN NOT NULL DEFAULT FALSE,
    gdpr_consent_at         TIMESTAMPTZ,
    marketing_consent       BOOLEAN NOT NULL DEFAULT FALSE,
    marketing_consent_at    TIMESTAMPTZ,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    last_login              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users (subscription_status);

-- ─────────────────────────────────────────
-- AUTH OTPs (passwordless login)
-- ─────────────────────────────────────────
CREATE TABLE auth_otps (
    otp_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otps_email ON auth_otps (email, expires_at);

-- ─────────────────────────────────────────
-- EVENTS (core append-only table)
-- ─────────────────────────────────────────
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id        VARCHAR(255) NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type      VARCHAR(100) NOT NULL,
    data            JSONB NOT NULL,
    embedding       vector(1536),
    parent_event_id UUID REFERENCES events(event_id),  -- causal link
    session_id      VARCHAR(255),                       -- group related events
    sequence_no     BIGSERIAL,                          -- monotonic, never gaps
    checksum        VARCHAR(64),                        -- SHA-256 of event content
    metadata        JSONB,

    CONSTRAINT fk_agent FOREIGN KEY (agent_id, tenant_id)
        REFERENCES agents (agent_id, tenant_id)
);

-- Indexes
CREATE INDEX idx_events_agent_time
    ON events (tenant_id, agent_id, timestamp DESC);

CREATE INDEX idx_events_parent
    ON events (parent_event_id)
    WHERE parent_event_id IS NOT NULL;

CREATE INDEX idx_events_session
    ON events (tenant_id, session_id, timestamp ASC)
    WHERE session_id IS NOT NULL;

CREATE INDEX idx_events_type
    ON events (tenant_id, event_type, timestamp DESC);

CREATE INDEX idx_events_data
    ON events USING gin (data);

-- Vector index (HNSW — better recall than IVFFlat)
CREATE INDEX idx_events_embedding
    ON events USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ─────────────────────────────────────────
-- USAGE METERING
-- ─────────────────────────────────────────
CREATE TABLE usage_daily (
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    events_written  BIGINT DEFAULT 0,
    queries_run     BIGINT DEFAULT 0,
    searches_run    BIGINT DEFAULT 0,
    PRIMARY KEY (tenant_id, date)
);

-- ─────────────────────────────────────────
-- DEMO REQUESTS (landing page)
-- ─────────────────────────────────────────
CREATE TABLE demo_requests (
    request_id    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name    VARCHAR(80) NOT NULL,
    last_name     VARCHAR(80) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    company_name  VARCHAR(255) NOT NULL,
    website       VARCHAR(500) NOT NULL,
    position      VARCHAR(120),
    source        VARCHAR(64),
    ip_address    VARCHAR(64),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_demo_requests_created ON demo_requests (created_at DESC);
