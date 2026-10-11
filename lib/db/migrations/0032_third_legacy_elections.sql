CREATE TABLE elections (
  id TEXT PRIMARY KEY NOT NULL,
  state_json TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  command_id TEXT NOT NULL,
  command_json TEXT NOT NULL,
  spreadsheet_id TEXT,
  synced_revision INTEGER NOT NULL DEFAULT -1,
  sync_error TEXT,
  sync_lease_until INTEGER NOT NULL DEFAULT 0,
  drive_creation_attempted INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE election_revisions (
  election_id TEXT NOT NULL REFERENCES elections(id),
  revision INTEGER NOT NULL,
  command_id TEXT NOT NULL UNIQUE,
  command_json TEXT NOT NULL,
  state_json TEXT NOT NULL,
  saved_at TEXT NOT NULL,
  saved_by TEXT NOT NULL,
  PRIMARY KEY (election_id, revision)
);

CREATE INDEX elections_pending_sync ON elections(synced_revision, revision);

CREATE TRIGGER election_created AFTER INSERT ON elections BEGIN
  INSERT INTO election_revisions VALUES (NEW.id, NEW.revision, NEW.command_id, NEW.command_json, NEW.state_json, NEW.updated_at, NEW.updated_by);
END;

CREATE TRIGGER election_changed AFTER UPDATE OF revision ON elections
WHEN NEW.revision > OLD.revision BEGIN
  INSERT INTO election_revisions VALUES (NEW.id, NEW.revision, NEW.command_id, NEW.command_json, NEW.state_json, NEW.updated_at, NEW.updated_by);
END;
