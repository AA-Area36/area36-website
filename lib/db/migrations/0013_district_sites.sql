-- District sub-sites (hosted or external redirect) + district-scoped content.

CREATE TABLE IF NOT EXISTS district_sites (
  district_number INTEGER PRIMARY KEY,
  subdomain TEXT NOT NULL UNIQUE, -- e.g. "d24"
  display_name TEXT NOT NULL DEFAULT '',
  enabled INTEGER NOT NULL DEFAULT 0,
  mode TEXT NOT NULL CHECK (mode IN ('hosted', 'external_redirect')),
  redirect_url TEXT, -- required when mode = external_redirect
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_district_sites_enabled ON district_sites(enabled);

CREATE TABLE IF NOT EXISTS district_admins (
  district_number INTEGER NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'editor')) DEFAULT 'editor',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (district_number, email),
  FOREIGN KEY (district_number) REFERENCES district_sites(district_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_district_admins_email ON district_admins(email);

CREATE TABLE IF NOT EXISTS district_contacts (
  id TEXT PRIMARY KEY,
  district_number INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('officer', 'chair', 'other')) DEFAULT 'other',
  role TEXT NOT NULL,
  name TEXT,
  email TEXT,
  phone TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (district_number) REFERENCES district_sites(district_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_district_contacts_district ON district_contacts(district_number);

CREATE TABLE IF NOT EXISTS district_positions (
  id TEXT PRIMARY KEY,
  district_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'filled')) DEFAULT 'open',
  contact_name TEXT,
  contact_email TEXT,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (district_number) REFERENCES district_sites(district_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_district_positions_district ON district_positions(district_number);

CREATE TABLE IF NOT EXISTS district_updates (
  id TEXT PRIMARY KEY,
  district_number INTEGER NOT NULL,
  committee TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TEXT, -- null = draft
  author_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (district_number) REFERENCES district_sites(district_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_district_updates_district_published ON district_updates(district_number, published_at);

-- District calendar: add optional district_number field to events.
ALTER TABLE events ADD COLUMN district_number INTEGER;
CREATE INDEX IF NOT EXISTS idx_events_district_status_date ON events(district_number, status, date);

