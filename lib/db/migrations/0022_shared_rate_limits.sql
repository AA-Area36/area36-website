CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT PRIMARY KEY NOT NULL,
  count INTEGER NOT NULL,
  reset_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits (reset_at);
