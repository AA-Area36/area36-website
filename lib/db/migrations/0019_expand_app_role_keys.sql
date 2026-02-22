-- Allow custom app role keys beyond the initial admin/officer/chair set.
-- Rebuild app_roles without CHECK constraint and rebuild app_user_access FK safely.

ALTER TABLE app_user_access RENAME TO app_user_access_old;
ALTER TABLE app_roles RENAME TO app_roles_old;

CREATE TABLE app_roles (
  role_key TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  default_permissions_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO app_roles (role_key, display_name, default_permissions_json, created_at, updated_at)
SELECT role_key, display_name, default_permissions_json, created_at, updated_at
FROM app_roles_old;

CREATE TABLE app_user_access (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  role_key TEXT NOT NULL DEFAULT 'chair' REFERENCES app_roles(role_key) ON DELETE RESTRICT,
  additional_permissions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO app_user_access (user_id, role_key, additional_permissions_json, created_at, updated_at)
SELECT user_id, role_key, additional_permissions_json, created_at, updated_at
FROM app_user_access_old;

DROP TABLE app_user_access_old;
DROP TABLE app_roles_old;

CREATE INDEX IF NOT EXISTS idx_app_user_access_role_key ON app_user_access(role_key);
