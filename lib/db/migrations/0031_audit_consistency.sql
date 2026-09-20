CREATE INDEX IF NOT EXISTS file_metadata_category_lower_idx ON file_metadata(lower(category));

CREATE TABLE IF NOT EXISTS object_cleanup_pending (
  object_key TEXT PRIMARY KEY NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quorum_submission_reservations (
  event_key TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  row_number INTEGER NOT NULL,
  submitted_at TEXT NOT NULL,
  PRIMARY KEY (event_key, submission_id),
  UNIQUE (event_key, row_number)
);

CREATE TABLE IF NOT EXISTS quorum_creation_attempts (
  event_key TEXT PRIMARY KEY NOT NULL,
  payload_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS quorum_featured_selection (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  event_key TEXT NOT NULL
);
