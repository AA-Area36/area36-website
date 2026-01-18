-- Migration: Add structured time fields and denial reason
-- This migration:
-- 1. Renames 'time' to 'start_time'
-- 2. Adds 'end_time' column
-- 3. Adds 'timezone' column with default 'America/Chicago'
-- 4. Adds 'denial_reason' column

-- SQLite doesn't support RENAME COLUMN in older versions, so we need to:
-- 1. Create a new table with the correct schema
-- 2. Copy data from the old table
-- 3. Drop the old table
-- 4. Rename the new table

-- Step 1: Create the new events table with updated schema
CREATE TABLE IF NOT EXISTS events_new (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  end_date TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Chicago',
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Assembly','Regional','Workshop','Meeting','Committee','District')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  submitter_email TEXT NOT NULL,
  flyer_url TEXT,
  denial_reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by TEXT,
  reviewed_at TEXT
);

-- Step 2: Copy data from old table to new table
-- Map 'time' to 'start_time', set timezone to default, end_time and denial_reason are null
INSERT INTO events_new (
  id, title, date, end_date, start_time, end_time, timezone, location, description,
  type, status, submitter_email, flyer_url, denial_reason, created_at, updated_at,
  reviewed_by, reviewed_at
)
SELECT
  id, title, date, end_date, time, NULL, 'America/Chicago', location, description,
  type, status, submitter_email, flyer_url, NULL, created_at, updated_at,
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
