CREATE TABLE IF NOT EXISTS uptime_daily (
  day TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  checks_total INTEGER NOT NULL DEFAULT 0,
  checks_ok INTEGER NOT NULL DEFAULT 0,
  latency_ms_sum INTEGER NOT NULL DEFAULT 0,
  latency_ms_max INTEGER NOT NULL DEFAULT 0,
  last_status INTEGER,
  last_checked_at TEXT,
  PRIMARY KEY (day, endpoint)
);

CREATE TABLE IF NOT EXISTS errors_daily (
  day TEXT NOT NULL,
  error_kind TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  sample_message TEXT,
  sample_route TEXT,
  last_seen_at TEXT,
  PRIMARY KEY (day, error_kind, fingerprint)
);

CREATE TABLE IF NOT EXISTS reports_monthly (
  month TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  subject TEXT NOT NULL,
  r2_key_html TEXT,
  r2_key_json TEXT
);
