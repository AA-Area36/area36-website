CREATE TABLE IF NOT EXISTS rate_limit_attempts (
  attempt_id TEXT PRIMARY KEY NOT NULL,
  key_hash TEXT NOT NULL,
  reset_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_attempts_reset_at
  ON rate_limit_attempts (reset_at);

CREATE TRIGGER IF NOT EXISTS rate_limit_attempt_insert
AFTER INSERT ON rate_limit_attempts
BEGIN
  INSERT INTO rate_limits (key_hash, count, reset_at, updated_at)
  VALUES (NEW.key_hash, 1, NEW.reset_at, NEW.created_at)
  ON CONFLICT(key_hash) DO UPDATE SET
    count = CASE
      WHEN rate_limits.reset_at <= excluded.updated_at THEN 1
      ELSE rate_limits.count + 1
    END,
    reset_at = CASE
      WHEN rate_limits.reset_at <= excluded.updated_at THEN excluded.reset_at
      ELSE rate_limits.reset_at
    END,
    updated_at = excluded.updated_at;
END;
