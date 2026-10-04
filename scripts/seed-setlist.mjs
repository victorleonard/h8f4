/**
 * Crée / met à jour la setlist « Concert » avec l’ordre défini du répertoire.
 *
 * Usage:
 *   npm run seed:setlist-songs && npm run seed:setlist
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";

const require = createRequire(import.meta.url);
const Database = require("better-sqlite3");

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const dbPath = process.env.PROPAL_DB_PATH ?? resolve(root, "data/propal.db");

const SETLIST_NAME = "Concert";

/** Ordre des titres (correspondance souple sur le titre en base). */
const ORDERED_TITLES = [
  "Beds Are Burning",
  "Take Me Out",
  "Boys Don't Cry",
  "Time Is Running Out",
  "I Wanna Be Your Slave",
  "Fortunate Son",
  "Paranoid",
  "House of the Rising Sun",
  "Whole Lotta Love",
  "Dream On",
  "The Loneliest",
  "Where Is My Mind?",
  "Holiday",
  "Come Out and Play",
  "Song 2",
  "Dad Algorithm",
  "Seven Nation Army",
  "Beautiful Things",
  "Smells Like Teen Spirit",
  "I Love Rock 'n Roll",
  "We Will Rock You",
  "Small Print",
  "Given Up",
  "Bullet with Butterfly Wings",
  "Zombie",
  "Highway to Hell",
  "Digging the Grave",
  "Temple Of Ekur",
  "Lonely Boy",
];

function normalizeTitle(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’ʻ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

mkdirSync(dirname(dbPath), { recursive: true });
const db = new Database(dbPath);
db.pragma("foreign_keys = ON");

db.exec(`
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
`);

const songs = db.prepare(`SELECT id, title FROM songs`).all();
const byNormalized = new Map();
for (const song of songs) {
  byNormalized.set(normalizeTitle(song.title), song);
}

const resolved = [];
const missing = [];
for (const title of ORDERED_TITLES) {
  const song = byNormalized.get(normalizeTitle(title));
  if (!song) {
    missing.push(title);
    continue;
  }
  resolved.push(song);
}

if (missing.length > 0) {
  console.error("Titres introuvables en base (lance d’abord npm run seed:setlist-songs) :");
  for (const title of missing) console.error(`  - ${title}`);
  db.close();
  process.exit(1);
}

const now = new Date().toISOString();
const existing = db
  .prepare(`SELECT id FROM setlists WHERE lower(name) = lower(?) LIMIT 1`)
  .get(SETLIST_NAME);

const setlistId = existing?.id ?? randomUUID();

const tx = db.transaction(() => {
  if (existing?.id) {
    db.prepare(`UPDATE setlists SET updated_at = ? WHERE id = ?`).run(now, setlistId);
  } else {
    db.prepare(
      `INSERT INTO setlists (id, name, notes, concert_date, created_at, updated_at)
       VALUES (?, ?, '', NULL, ?, ?)`,
    ).run(setlistId, SETLIST_NAME, now, now);
  }

  db.prepare(`DELETE FROM setlist_items WHERE setlist_id = ?`).run(setlistId);
  db.prepare(`DELETE FROM setlist_songs WHERE setlist_id = ?`).run(setlistId);

  const insertItem = db.prepare(
    `INSERT INTO setlist_items (id, setlist_id, position, kind, song_id, duration_seconds)
     VALUES (?, ?, ?, 'song', ?, NULL)`,
  );
  const insertLegacy = db.prepare(
    `INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)`,
  );

  resolved.forEach((song, position) => {
    insertItem.run(randomUUID(), setlistId, position, song.id);
    insertLegacy.run(setlistId, song.id, position);
  });
});

tx();
db.close();

console.log(
  `Setlist « ${SETLIST_NAME} » : ${resolved.length} titres → ${dbPath} (${existing?.id ? "mise à jour" : "créée"})`,
);
