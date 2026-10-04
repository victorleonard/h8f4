/**
 * Importe le répertoire statique (src/data/repertoire.ts) dans SQLite.
 * Durée / tempo : valeurs du seed si présentes, sinon 3:30 / 120 BPM.
 * Pochette : recherche iTunes (vignette album) si absente ou rafraîchie.
 *
 * Usage:
 *   npm run seed:setlist-songs
 *   SEED_REFRESH_ARTWORK=1 npm run seed:setlist-songs   # force le refresh des pochettes
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
const REFRESH_ARTWORK = process.env.SEED_REFRESH_ARTWORK === "1";

const DEFAULT_DURATION = 210; // 3:30
const DEFAULT_TEMPO = 120;
const ITUNES_DELAY_MS = 150;

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

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function normalize(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’ʻ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resizeArtworkUrl(url, size = 200) {
  return url.replace(/(\d+)x(\d+)(bb\.jpg)/i, `${size}x${size}$3`);
}

function scoreTrack(track, title, artist) {
  const trackTitle = normalize(track.trackName ?? "");
  const trackArtist = normalize(track.artistName ?? "");
  const wantTitle = normalize(title);
  const wantArtist = normalize(artist);
  let score = 0;
  if (trackTitle === wantTitle) score += 10;
  else if (trackTitle.includes(wantTitle) || wantTitle.includes(trackTitle)) score += 6;
  if (trackArtist === wantArtist) score += 8;
  else if (trackArtist.includes(wantArtist) || wantArtist.includes(trackArtist)) score += 4;
  return score;
}

async function fetchArtwork(title, artist) {
  const term = `${title} ${artist}`.trim();
  const itunesUrl = new URL("https://itunes.apple.com/search");
  itunesUrl.searchParams.set("term", term);
  itunesUrl.searchParams.set("entity", "song");
  itunesUrl.searchParams.set("limit", "8");
  itunesUrl.searchParams.set("country", "FR");
  itunesUrl.searchParams.set("lang", "fr_fr");

  try {
    const response = await fetch(itunesUrl, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;

    const data = await response.json();
    const results = Array.isArray(data?.results) ? data.results : [];
    if (results.length === 0) return null;

    let best = null;
    let bestScore = -1;
    for (const track of results) {
      const score = scoreTrack(track, title, artist);
      if (score > bestScore) {
        bestScore = score;
        best = track;
      }
    }

    if (!best || bestScore < 6) return null;
    const raw = best.artworkUrl100 ?? best.artworkUrl60;
    if (!raw || typeof raw !== "string") return null;
    return resizeArtworkUrl(raw, 200);
  } catch (error) {
    console.warn(`  iTunes KO pour « ${title} » :`, error instanceof Error ? error.message : error);
    return null;
  }
}

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
  `SELECT id, duration_seconds, tempo, artwork_url
   FROM songs
   WHERE lower(title) = lower(?) AND lower(artist) = lower(?)
   LIMIT 1`,
);
const insert = db.prepare(
  `INSERT INTO songs (id, title, artist, duration_seconds, tempo, artwork_url, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
);
const updateRow = db.prepare(
  `UPDATE songs
   SET duration_seconds = ?, tempo = ?, artwork_url = ?, updated_at = ?
   WHERE id = ?`,
);

let inserted = 0;
let updated = 0;
let skipped = 0;
let artworkOk = 0;
let artworkMiss = 0;
const now = new Date().toISOString();

console.log(`Seed ${songs.length} titre(s) → ${dbPath}${REFRESH_ARTWORK ? " (refresh pochettes)" : ""}`);

for (const song of songs) {
  const row = existing.get(song.title, song.artist);
  const needArtwork = REFRESH_ARTWORK || !row?.artwork_url;
  let artworkUrl = row?.artwork_url ?? null;

  if (needArtwork) {
    process.stdout.write(`  pochette : ${song.title} — ${song.artist}… `);
    const fetched = await fetchArtwork(song.title, song.artist);
    await sleep(ITUNES_DELAY_MS);
    if (fetched) {
      artworkUrl = fetched;
      artworkOk += 1;
      console.log("ok");
    } else {
      artworkMiss += 1;
      console.log("introuvable");
    }
  }

  if (row?.id) {
    const sameMeta =
      row.duration_seconds === song.durationSeconds &&
      row.tempo === song.tempo &&
      (row.artwork_url ?? null) === (artworkUrl ?? null);
    if (sameMeta) {
      skipped += 1;
      continue;
    }
    updateRow.run(song.durationSeconds, song.tempo, artworkUrl, now, row.id);
    updated += 1;
    continue;
  }

  insert.run(
    randomUUID(),
    song.title,
    song.artist,
    song.durationSeconds,
    song.tempo,
    artworkUrl,
    now,
    now,
  );
  inserted += 1;
}

db.close();

console.log(
  `Setlist songs: ${inserted} ajouté(s), ${updated} mis à jour, ${skipped} inchangé(s) · pochettes ${artworkOk} ok / ${artworkMiss} manquante(s) → ${dbPath}`,
);
