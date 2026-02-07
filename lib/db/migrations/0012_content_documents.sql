-- Content documents for i18n + CMS-style content management.
-- One row per (scope, locale), with draft/published JSON stored as text.

CREATE TABLE IF NOT EXISTS content_documents (
  scope TEXT NOT NULL,
  locale TEXT NOT NULL,
  draft_json TEXT,
  published_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  draft_updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  published_at TEXT,
  updated_by TEXT,
  PRIMARY KEY (scope, locale)
);

CREATE INDEX IF NOT EXISTS idx_content_documents_scope ON content_documents(scope);
