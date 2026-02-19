CREATE TABLE IF NOT EXISTS app_roles (
  role_key TEXT PRIMARY KEY CHECK (role_key IN ('admin', 'officer', 'chair')),
  display_name TEXT NOT NULL,
  default_permissions_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS app_user_access (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL DEFAULT 'chair' REFERENCES app_roles(role_key) ON DELETE RESTRICT,
  additional_permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_app_user_access_role_key ON app_user_access(role_key);

INSERT OR IGNORE INTO app_roles (role_key, display_name, default_permissions_json)
VALUES
  ('admin', 'Admin', '["events:read","events:write","recordings:read","recordings:write","files:read","files:write","subscription-drives:read","subscription-drives:write","reports:read","content:read","content:write","district-sites:read","district-sites:write","corrections:view","corrections:edit","corrections:match","access:read","access:write"]'),
  ('officer', 'Officer', '["events:read","events:write","recordings:read","recordings:write","files:read","files:write","subscription-drives:read","subscription-drives:write","reports:read","content:read","content:write","district-sites:read","corrections:view"]'),
  ('chair', 'Chair', '["events:read","recordings:read","files:read","subscription-drives:read","reports:read","content:read","district-sites:read","corrections:view"]');

CREATE TABLE IF NOT EXISTS corrections_contacts (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  street_address TEXT,
  city TEXT NOT NULL,
  county TEXT,
  state TEXT,
  zip_code TEXT,
  email TEXT,
  email_normalized TEXT,
  sobriety_date TEXT,
  phone_primary TEXT,
  phone_secondary TEXT,
  birth_year INTEGER,
  is_spanish_speaking INTEGER NOT NULL DEFAULT 0,
  other_languages TEXT,
  home_group TEXT,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  legacy_source_page TEXT,
  legacy_internal_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corrections_contacts_email_normalized
  ON corrections_contacts(email_normalized)
  WHERE email_normalized IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_corrections_contacts_active ON corrections_contacts(active);
CREATE INDEX IF NOT EXISTS idx_corrections_contacts_city_state ON corrections_contacts(city, state);
CREATE INDEX IF NOT EXISTS idx_corrections_contacts_zip_code ON corrections_contacts(zip_code);

CREATE TABLE IF NOT EXISTS corrections_recipients (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  gender TEXT NOT NULL,
  birth_year INTEGER,
  discharge_date TEXT,
  phone TEXT,
  facility_name TEXT NOT NULL,
  source TEXT NOT NULL,
  contact_email TEXT,
  release_address TEXT,
  release_city TEXT,
  release_county TEXT,
  release_state TEXT,
  release_zip TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'pending', 'completed')),
  legacy_source_page TEXT,
  legacy_internal_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_corrections_recipients_status ON corrections_recipients(status);
CREATE INDEX IF NOT EXISTS idx_corrections_recipients_city_state ON corrections_recipients(release_city, release_state);
CREATE INDEX IF NOT EXISTS idx_corrections_recipients_zip ON corrections_recipients(release_zip);

CREATE TABLE IF NOT EXISTS corrections_matches (
  id TEXT PRIMARY KEY,
  recipient_id TEXT NOT NULL REFERENCES corrections_recipients(id) ON DELETE CASCADE,
  contact_id TEXT NOT NULL REFERENCES corrections_contacts(id) ON DELETE CASCADE,
  is_active INTEGER NOT NULL DEFAULT 1,
  matched_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  matched_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_corrections_matches_recipient ON corrections_matches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_corrections_matches_contact ON corrections_matches(contact_id);
CREATE INDEX IF NOT EXISTS idx_corrections_matches_is_active ON corrections_matches(is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corrections_matches_one_active_per_recipient
  ON corrections_matches(recipient_id)
  WHERE is_active = 1;
