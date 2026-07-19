-- ZizkaDB Schema (modified for local dev without pgvector)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
    tenant_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE api_keys (
    key_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id    VARCHAR(255),
    key_hash    VARCHAR(255) NOT NULL UNIQUE,
    key_prefix  VARCHAR(24) NOT NULL,
    name        VARCHAR(255),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    last_used   TIMESTAMPTZ,
    revoked     BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_api_keys_agent FOREIGN KEY (agent_id, tenant_id)
        REFERENCES agents (agent_id, tenant_id) ON DELETE CASCADE
);
CREATE INDEX idx_api_keys_hash ON api_keys (key_hash);

CREATE TABLE users (
    user_id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email                   VARCHAR(255) UNIQUE NOT NULL,
    tenant_id               UUID REFERENCES tenants(tenant_id),
    plan                    VARCHAR(50),
    subscription_status     VARCHAR(50),
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

CREATE TABLE auth_otps (
    otp_id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(255) NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_otps_email ON auth_otps (email, expires_at);

-- EVENTS table: embedding column is BYTEA (placeholder) instead of vector(1536)
CREATE TABLE events (
    event_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    agent_id        VARCHAR(255) NOT NULL,
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type      VARCHAR(100) NOT NULL,
    data            JSONB NOT NULL,
    embedding       BYTEA,
    parent_event_id UUID REFERENCES events(event_id),
    session_id      VARCHAR(255),
    sequence_no     BIGSERIAL,
    checksum        VARCHAR(64),
    metadata        JSONB,
    CONSTRAINT fk_agent FOREIGN KEY (agent_id, tenant_id)
        REFERENCES agents (agent_id, tenant_id)
);

CREATE INDEX idx_events_agent_time ON events (tenant_id, agent_id, timestamp DESC);
CREATE INDEX idx_events_parent ON events (parent_event_id) WHERE parent_event_id IS NOT NULL;
CREATE INDEX idx_events_session ON events (tenant_id, session_id, timestamp ASC) WHERE session_id IS NOT NULL;
CREATE INDEX idx_events_type ON events (tenant_id, event_type, timestamp DESC);
CREATE INDEX idx_events_data ON events USING gin (data);

CREATE TABLE usage_daily (
    tenant_id       UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    events_written  BIGINT DEFAULT 0,
    queries_run     BIGINT DEFAULT 0,
    searches_run    BIGINT DEFAULT 0,
    PRIMARY KEY (tenant_id, date)
);

CREATE TABLE IF NOT EXISTS sdk_telemetry (
    install_id   VARCHAR(64) PRIMARY KEY,
    sdk          VARCHAR(50),
    sdk_version  VARCHAR(30),
    runtime      VARCHAR(50),
    os           VARCHAR(50),
    mode         VARCHAR(30),
    first_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ping_count   INT NOT NULL DEFAULT 1
);
