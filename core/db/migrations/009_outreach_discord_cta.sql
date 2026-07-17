-- Editable Discord CTA fields for outreach emails (additive only)
ALTER TABLE email_outreach_sends
    ADD COLUMN IF NOT EXISTS discord_cta_label VARCHAR(80);
ALTER TABLE email_outreach_sends
    ADD COLUMN IF NOT EXISTS discord_cta_url TEXT;
