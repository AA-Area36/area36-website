-- Add TBD flags to events table
ALTER TABLE events ADD COLUMN time_tbd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN address_tbd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN meeting_link_tbd INTEGER NOT NULL DEFAULT 0;

-- Create event_flyers table for multiple flyers per event
CREATE TABLE IF NOT EXISTS event_flyers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for event flyers
CREATE INDEX IF NOT EXISTS idx_event_flyers_event_id ON event_flyers(event_id);

-- Create event_to_types junction table for multi-select event types
CREATE TABLE IF NOT EXISTS event_to_types (
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  PRIMARY KEY (event_id, type)
);

-- Create index for event types lookup
CREATE INDEX IF NOT EXISTS idx_event_to_types_event_id ON event_to_types(event_id);
CREATE INDEX IF NOT EXISTS idx_event_to_types_type ON event_to_types(type);

-- Migrate existing event types to junction table
INSERT INTO event_to_types (event_id, type)
SELECT id, type FROM events WHERE type IS NOT NULL;

-- Create recording_folders table for password-protected recordings
CREATE TABLE IF NOT EXISTS recording_folders (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL UNIQUE,
  folder_name TEXT NOT NULL,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for recording folder lookups
CREATE INDEX IF NOT EXISTS idx_recording_folders_drive_id ON recording_folders(drive_id);
