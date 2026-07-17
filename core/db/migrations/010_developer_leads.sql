-- Developer Leads: GitHub public-email discovery for admin outreach
CREATE TABLE IF NOT EXISTS developer_lead_runs (
    run_id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    keywords        TEXT NOT NULL,
    country_code    VARCHAR(8) NOT NULL DEFAULT 'WW',
    status          VARCHAR(32) NOT NULL DEFAULT 'running',
    found_count     INTEGER NOT NULL DEFAULT 0,
    inserted_count  INTEGER NOT NULL DEFAULT 0,
    meta            JSONB,
    error           TEXT,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS developer_leads (
    lead_id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email             VARCHAR(255) NOT NULL,
    name              VARCHAR(255),
    github_username   VARCHAR(120),
    profile_url       TEXT,
    bio               TEXT,
    location          TEXT,
    country_code      VARCHAR(8) NOT NULL DEFAULT 'WW',
    matched_keyword   VARCHAR(80),
    matched_repo      TEXT,
    signal            VARCHAR(32),
    match_reason      TEXT,
    status            VARCHAR(32) NOT NULL DEFAULT 'new',
    run_id            UUID REFERENCES developer_lead_runs(run_id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_developer_leads_email
    ON developer_leads (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_developer_leads_created
    ON developer_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_developer_leads_status
    ON developer_leads (status, created_at DESC);
