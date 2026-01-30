-- File metadata table for custom display names and password protection
CREATE TABLE IF NOT EXISTS file_metadata (
  id TEXT PRIMARY KEY,
  drive_id TEXT NOT NULL UNIQUE,
  parent_folder_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  password TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Index for looking up metadata by drive ID
CREATE INDEX IF NOT EXISTS idx_file_metadata_drive_id ON file_metadata(drive_id);

-- Index for querying files by parent folder
CREATE INDEX IF NOT EXISTS idx_file_metadata_parent_folder ON file_metadata(parent_folder_id);
