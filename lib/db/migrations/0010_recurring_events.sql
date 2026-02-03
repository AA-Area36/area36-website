-- Add recurrence fields to events table
ALTER TABLE events ADD COLUMN is_recurring INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN recurrence_type TEXT DEFAULT 'none';
ALTER TABLE events ADD COLUMN recurrence_pattern TEXT;
ALTER TABLE events ADD COLUMN monthly_pattern_type TEXT;
ALTER TABLE events ADD COLUMN monthly_pattern_value TEXT;
ALTER TABLE events ADD COLUMN recur_until TEXT;

-- Create event_exceptions table for recurring event modifications/cancellations
CREATE TABLE event_exceptions (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  occurrence_date TEXT NOT NULL,
  exception_type TEXT NOT NULL,
  title TEXT,
  start_time TEXT,
  end_time TEXT,
  end_date TEXT,
  location_type TEXT,
  address TEXT,
  meeting_link TEXT,
  description TEXT,
  time_tbd INTEGER,
  address_tbd INTEGER,
  meeting_link_tbd INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- Index for efficient exception lookups by event and date
CREATE INDEX idx_event_exceptions_event_date ON event_exceptions(event_id, occurrence_date);

-- Index for looking up exceptions by occurrence date (for date range queries)
CREATE INDEX idx_event_exceptions_occurrence ON event_exceptions(occurrence_date);
