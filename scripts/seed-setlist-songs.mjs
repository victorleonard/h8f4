/**
 * Importe le répertoire statique (src/data/repertoire.ts) dans SQLite.
 * Durée / tempo : valeurs du seed si présentes, sinon 3:30 / 120 BPM.
 *
 * Usage:
 *   npm run seed:setlist-songs
 */
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const repertoirePath = resolve(root, "src/data/repertoire.ts");
const dbPath = process.env.PROPAL_DB_PATH ?? resolve(root, "data/propal.db");

const DEFAULT_DURATION = 210; // 3:30
const DEFAULT_TEMPO = 120;

const source = readFileSync(repertoirePath, "utf8");
const matches = [
  ...source.matchAll(
    /\{\s*title:\s*'((?:\\'|[^'])*)'\s*,\s*artist:\s*'((?:\\'|[^'])*)'(?:\s*,\s*durationSeconds:\s*(\d+))?(?:\s*,\s*tempo:\s*(\d+))?\s*\}/g,
  ),
];

if (matches.length === 0) {
  console.error("Aucun titre trouvé dans src/data/repertoire.ts");
  process.exit(1);
}

const songs = matches.map((match) => ({
  title: match[1].replaceAll("\\'", "'"),
  artist: match[2].replaceAll("\\'", "'"),
  durationSeconds: match[3] ? Number(match[3]) : DEFAULT_DURATION,
  tempo: match[4] ? Number(match[4]) : DEFAULT_TEMPO,
}));

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");
db.exec(`
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
`);

const cols = db.prepare("PRAGMA table_info(songs)").all();
if (!cols.some((column) => column.name === "artwork_url")) {
  db.exec("ALTER TABLE songs ADD COLUMN artwork_url TEXT");
}

const existing = db.prepare(
  `SELECT id FROM songs WHERE lower(title) = lower(?) AND lower(artist) = lower(?) LIMIT 1`,
);
const insert = db.prepare(
  `INSERT INTO songs (id, title, artist, duration_seconds, tempo, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
);
const updateMeta = db.prepare(
  `UPDATE songs
   SET duration_seconds = ?, tempo = ?, updated_at = ?
   WHERE id = ?`,
);

let inserted = 0;
let updated = 0;
let skipped = 0;
const now = new Date().toISOString();

const currentMeta = db.prepare(
  `SELECT duration_seconds, tempo FROM songs WHERE id = ?`,
);

const tx = db.transaction(() => {
  for (const song of songs) {
    const row = existing.get(song.title, song.artist);
    if (row?.id) {
      const meta = currentMeta.get(row.id);
      if (
        meta &&
        meta.duration_seconds === song.durationSeconds &&
        meta.tempo === song.tempo
      ) {
        skipped += 1;
      } else {
        updateMeta.run(song.durationSeconds, song.tempo, now, row.id);
        updated += 1;
      }
      continue;
    }
    insert.run(
      randomUUID(),
      song.title,
      song.artist,
      song.durationSeconds,
      song.tempo,
      now,
      now,
    );
    inserted += 1;
  }
});

tx();
db.close();

console.log(
  `Setlist songs: ${inserted} ajouté(s), ${updated} mis à jour, ${skipped} inchangé(s) → ${dbPath}`,
);
