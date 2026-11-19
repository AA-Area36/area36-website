CREATE TABLE voting_rooms (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('election', 'motion')),
  title TEXT NOT NULL,
  quorum_key TEXT NOT NULL,
  election_id TEXT REFERENCES elections(id),
  office_index INTEGER,
  ballot_number INTEGER,
  room_code TEXT NOT NULL UNIQUE,
  version INTEGER NOT NULL DEFAULT 0,
  show_code INTEGER NOT NULL DEFAULT 0 CHECK (show_code IN (0, 1)),
  credential_seed TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  results_published INTEGER NOT NULL DEFAULT 0 CHECK (results_published IN (0, 1)),
  created_at TEXT NOT NULL,
  created_by TEXT NOT NULL,
  closed_at TEXT,
  closed_by TEXT,
  CHECK (
    (kind = 'motion' AND election_id IS NULL AND office_index IS NULL AND ballot_number IS NULL)
    OR (kind = 'election' AND election_id IS NOT NULL AND office_index BETWEEN 0 AND 5 AND ballot_number BETWEEN 1 AND 5)
  ),
  UNIQUE (election_id, office_index, ballot_number)
);

CREATE UNIQUE INDEX voting_one_open_ballot_per_election ON voting_rooms(election_id) WHERE status = 'open';
CREATE INDEX voting_recent_motions ON voting_rooms(kind, created_at DESC);

CREATE TABLE voting_choices (
  room_id TEXT NOT NULL REFERENCES voting_rooms(id),
  choice_id TEXT NOT NULL,
  label TEXT NOT NULL,
  ordinal INTEGER NOT NULL,
  votes INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (room_id, choice_id)
);

CREATE TABLE voting_credentials (
  room_id TEXT NOT NULL REFERENCES voting_rooms(id),
  ordinal INTEGER NOT NULL,
  seat_label TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  receipt TEXT,
  PRIMARY KEY (room_id, code_hash),
  UNIQUE (room_id, ordinal)
);

-- The trigger consumes a credential and increments an aggregate in the same
-- transaction. Its input row is removed before the transaction commits.
CREATE TABLE voting_cast_input (
  room_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  choice_id TEXT NOT NULL,
  receipt TEXT NOT NULL
);

CREATE TRIGGER voting_count_cast AFTER INSERT ON voting_cast_input BEGIN
  UPDATE voting_credentials SET receipt = NEW.receipt
    WHERE room_id = NEW.room_id AND code_hash = NEW.code_hash AND receipt IS NULL;
  UPDATE voting_choices SET votes = votes + 1
    WHERE room_id = NEW.room_id AND choice_id = NEW.choice_id AND changes() = 1;
  DELETE FROM voting_cast_input WHERE rowid = NEW.rowid;
END;
