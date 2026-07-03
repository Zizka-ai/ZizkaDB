-- Enterprise contact form: optional role/title and lead source
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS position VARCHAR(120);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS source VARCHAR(64);
