CREATE TABLE IF NOT EXISTS file_cache_bust_pending (
  drive_id TEXT PRIMARY KEY,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_file_cache_bust_pending_updated_at
  ON file_cache_bust_pending(updated_at);
