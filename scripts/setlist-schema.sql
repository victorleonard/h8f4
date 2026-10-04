CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  tempo INTEGER NOT NULL CHECK (tempo > 0),
  artwork_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS setlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  concert_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS setlist_songs (
  setlist_id TEXT NOT NULL REFERENCES setlists (id) ON DELETE CASCADE,
  song_id TEXT NOT NULL REFERENCES songs (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  PRIMARY KEY (setlist_id, song_id),
  UNIQUE (setlist_id, position)
);

CREATE TABLE IF NOT EXISTS setlist_items (
  id TEXT PRIMARY KEY,
  setlist_id TEXT NOT NULL REFERENCES setlists (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('song', 'pause')),
  song_id TEXT REFERENCES songs (id) ON DELETE CASCADE,
  duration_seconds INTEGER,
  UNIQUE (setlist_id, position)
);

CREATE INDEX IF NOT EXISTS idx_songs_title ON songs (title COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_setlists_updated ON setlists (updated_at);
CREATE INDEX IF NOT EXISTS idx_setlist_songs_setlist ON setlist_songs (setlist_id, position);
CREATE INDEX IF NOT EXISTS idx_setlist_items_setlist ON setlist_items (setlist_id, position);
