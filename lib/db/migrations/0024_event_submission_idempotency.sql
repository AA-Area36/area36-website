ALTER TABLE events ADD COLUMN submission_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_submission_key
  ON events (submission_key)
  WHERE submission_key IS NOT NULL;
