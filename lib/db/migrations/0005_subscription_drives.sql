-- Create subscription_drives table
CREATE TABLE IF NOT EXISTS subscription_drives (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  prize_description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create drive_submissions table
CREATE TABLE IF NOT EXISTS drive_submissions (
  id TEXT PRIMARY KEY,
  drive_id TEXT REFERENCES subscription_drives(id),
  district TEXT NOT NULL,
  subscription_count INTEGER NOT NULL,
  confirmation_image_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  denial_reason TEXT,
  submitter_contact TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_drive_submissions_drive_id ON drive_submissions(drive_id);
CREATE INDEX IF NOT EXISTS idx_drive_submissions_status ON drive_submissions(status);
CREATE INDEX IF NOT EXISTS idx_drive_submissions_district ON drive_submissions(district);
CREATE INDEX IF NOT EXISTS idx_subscription_drives_is_active ON subscription_drives(is_active);

-- Seed initial January 2026 drive
INSERT INTO subscription_drives (id, name, description, start_date, end_date, prize_description, is_active)
VALUES (
  'drive_jan2026',
  'January 2026 Subscription Drive',
  'Districts compete to purchase the most Grapevine subscriptions. The winning district receives Grapevine materials!',
  '2026-01-01',
  '2026-01-31',
  'The winning district receives free Grapevine subscriptions and books for their district.',
  1
);
