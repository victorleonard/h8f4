import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { PROPAL_DB_SCHEMA } from "./propal-schema";
import { SETLIST_DB_SCHEMA } from "./setlist-schema";

let db: Database.Database | null = null;

export function getDbPath(): string {
  return process.env.PROPAL_DB_PATH ?? "./data/propal.db";
}

function ensureSetlistMigrations(database: Database.Database): void {
  const songColumns = database.prepare("PRAGMA table_info(songs)").all() as { name: string }[];
  if (songColumns.length > 0 && !songColumns.some((column) => column.name === "artwork_url")) {
    database.exec("ALTER TABLE songs ADD COLUMN artwork_url TEXT");
  }

  const tables = database
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
    .all() as { name: string }[];
  const tableNames = new Set(tables.map((row) => row.name));

  if (!tableNames.has("setlist_items")) {
    database.exec(`
      CREATE TABLE IF NOT EXISTS setlist_items (
        id TEXT PRIMARY KEY,
        setlist_id TEXT NOT NULL REFERENCES setlists (id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position >= 0),
        kind TEXT NOT NULL CHECK (kind IN ('song', 'pause')),
        song_id TEXT REFERENCES songs (id) ON DELETE CASCADE,
        duration_seconds INTEGER,
        UNIQUE (setlist_id, position)
      );
      CREATE INDEX IF NOT EXISTS idx_setlist_items_setlist ON setlist_items (setlist_id, position);
    `);
  }

  if (tableNames.has("setlist_songs")) {
    const orphanSetlists = database
      .prepare(
        `SELECT DISTINCT ss.setlist_id AS id
         FROM setlist_songs ss
         WHERE NOT EXISTS (
           SELECT 1 FROM setlist_items si WHERE si.setlist_id = ss.setlist_id
         )`,
      )
      .all() as { id: string }[];

    if (orphanSetlists.length > 0) {
      const insert = database.prepare(
        `INSERT INTO setlist_items (id, setlist_id, position, kind, song_id, duration_seconds)
         VALUES (?, ?, ?, 'song', ?, NULL)`,
      );
      const selectLegacy = database.prepare(
        `SELECT song_id, position
         FROM setlist_songs
         WHERE setlist_id = ?
         ORDER BY position ASC`,
      );

      for (const setlist of orphanSetlists) {
        const legacyRows = selectLegacy.all(setlist.id) as { song_id: string; position: number }[];
        for (const row of legacyRows) {
          insert.run(crypto.randomUUID(), setlist.id, row.position, row.song_id);
        }
      }
    }
  }
}

function initSchema(database: Database.Database): void {
  database.exec(PROPAL_DB_SCHEMA);
  database.exec(SETLIST_DB_SCHEMA);
  ensureSetlistMigrations(database);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  initSchema(db);

  return db;
}
