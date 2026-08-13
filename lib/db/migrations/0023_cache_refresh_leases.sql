CREATE TABLE IF NOT EXISTS cache_refresh_leases (
  key_hash TEXT PRIMARY KEY NOT NULL,
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_refresh_leases_expires_at
  ON cache_refresh_leases (expires_at);
