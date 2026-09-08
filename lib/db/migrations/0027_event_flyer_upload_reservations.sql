CREATE TABLE IF NOT EXISTS event_flyer_upload_reservations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  token_id TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  state TEXT NOT NULL CHECK (state IN ('reserved', 'committed')),
  expires_at INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_event_flyer_upload_reservations_event
  ON event_flyer_upload_reservations (event_id, state, expires_at);

CREATE INDEX IF NOT EXISTS idx_event_flyer_upload_reservations_token
  ON event_flyer_upload_reservations (token_id, state, expires_at);
