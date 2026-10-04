import { getDb } from "./db";
import type { Song } from "./setlist-types";

interface SongRow {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  tempo: number;
  artwork_url: string | null;
  created_at: string;
  updated_at: string;
}

function rowToSong(row: SongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    durationSeconds: row.duration_seconds,
    tempo: row.tempo,
    ...(row.artwork_url ? { artworkUrl: row.artwork_url } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listSongs(): Song[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, title, artist, duration_seconds, tempo, artwork_url, created_at, updated_at
       FROM songs
       ORDER BY title COLLATE NOCASE ASC, artist COLLATE NOCASE ASC`,
    )
    .all() as SongRow[];

  return rows.map(rowToSong);
}

export function getSong(id: string): Song | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, title, artist, duration_seconds, tempo, artwork_url, created_at, updated_at
       FROM songs WHERE id = ?`,
    )
    .get(id) as SongRow | undefined;

  return row ? rowToSong(row) : null;
}

export function createSong(input: {
  title: string;
  artist: string;
  durationSeconds: number;
  tempo: number;
  artworkUrl?: string;
}): Song {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO songs (id, title, artist, duration_seconds, tempo, artwork_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title,
    input.artist,
    input.durationSeconds,
    input.tempo,
    input.artworkUrl ?? null,
    now,
    now,
  );

  const song = getSong(id);
  if (!song) throw new Error("SONG_CREATE_FAILED");
  return song;
}

export function updateSong(input: {
  id: string;
  title: string;
  artist: string;
  durationSeconds: number;
  tempo: number;
  artworkUrl?: string | null;
}): Song {
  const db = getDb();
  const now = new Date().toISOString();

  const result = db
    .prepare(
      `UPDATE songs
       SET title = ?, artist = ?, duration_seconds = ?, tempo = ?, artwork_url = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      input.title,
      input.artist,
      input.durationSeconds,
      input.tempo,
      input.artworkUrl ?? null,
      now,
      input.id,
    );

  if (result.changes === 0) throw new Error("SONG_NOT_FOUND");

  const song = getSong(input.id);
  if (!song) throw new Error("SONG_NOT_FOUND");
  return song;
}

export function deleteSong(id: string): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM songs WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("SONG_NOT_FOUND");
}
