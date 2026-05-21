-- Soft-delete aware uniques (complement global uniques from init)
CREATE UNIQUE INDEX IF NOT EXISTS users_email_active_key
  ON users (email)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_active_key
  ON users (google_id)
  WHERE google_id IS NOT NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS urls_short_code_active_key
  ON urls (short_code)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS aliases_alias_occupied_key
  ON aliases (alias)
  WHERE deleted_at IS NULL
    AND status IN ('ACTIVE', 'GRACE', 'BLOCKED');

CREATE INDEX IF NOT EXISTS urls_expires_at_active_idx
  ON urls (expires_at)
  WHERE status = 'ACTIVE' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS subscriptions_user_active_idx
  ON subscriptions (user_id)
  WHERE status = 'ACTIVE';

ALTER TABLE daily_url_usage
  ADD CONSTRAINT daily_url_usage_identity_check
  CHECK (user_id IS NOT NULL OR creator_ip IS NOT NULL);
