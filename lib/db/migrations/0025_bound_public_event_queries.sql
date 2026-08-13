CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON events (status, date);

CREATE INDEX IF NOT EXISTS idx_events_status_recurring_until
  ON events (status, is_recurring, recur_until);
