-- Migration: Make start_time nullable to support TBD times
-- SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Step 1: Create new events table with nullable start_time
CREATE TABLE IF NOT EXISTS events_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT,
  end_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  location_type TEXT NOT NULL DEFAULT 'in-person',
  address TEXT,
  meeting_link TEXT,
  description TEXT NOT NULL,
  type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  submitter_email TEXT NOT NULL,
  flyer_url TEXT,
  denial_reason TEXT,
  time_tbd INTEGER NOT NULL DEFAULT 0,
  address_tbd INTEGER NOT NULL DEFAULT 0,
  meeting_link_tbd INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by TEXT,
  reviewed_at TEXT
);

-- Step 2: Copy data from old table
INSERT INTO events_new (
  id, title, date, end_date, start_time, end_time, timezone, location_type,
  address, meeting_link, description, type, status, submitter_email, flyer_url,
  denial_reason, time_tbd, address_tbd, meeting_link_tbd, created_at, updated_at,
  reviewed_by, reviewed_at
)
SELECT
  id, title, date, end_date, start_time, end_time, timezone, location_type,
  address, meeting_link, description, type, status, submitter_email, flyer_url,
  denial_reason, time_tbd, address_tbd, meeting_link_tbd, created_at, updated_at,
  reviewed_by, reviewed_at
FROM events;

-- Step 3: Drop the old table
DROP TABLE events;

-- Step 4: Rename the new table
ALTER TABLE events_new RENAME TO events;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
