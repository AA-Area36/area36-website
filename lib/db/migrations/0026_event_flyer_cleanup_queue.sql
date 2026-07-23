CREATE TABLE IF NOT EXISTS event_flyer_cleanup_pending (
  event_id TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_flyer_cleanup_pending_updated_at
  ON event_flyer_cleanup_pending (updated_at);
