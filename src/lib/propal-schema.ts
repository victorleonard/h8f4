export const PROPAL_DB_SCHEMA = `
PRAGMA journal_mode = WAL;

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  proposed_by TEXT NOT NULL REFERENCES members (id),
  created_at TEXT NOT NULL,
  artwork_url TEXT,
  spotify_url TEXT,
  deezer_url TEXT,
  youtube_url TEXT
);

CREATE TABLE IF NOT EXISTS ratings (
  proposal_id TEXT NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members (id),
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  PRIMARY KEY (proposal_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_proposals_created ON proposals (created_at);
`;
