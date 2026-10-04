import { getDb } from "./db";
import { summarizeSetlistDurations } from "./setlist-groups";
import type {
  Setlist,
  SetlistItem,
  SetlistItemInput,
  SetlistPauseItem,
  SetlistSongItem,
  SetlistSongRef,
} from "./setlist-types";

interface SetlistRow {
  id: string;
  name: string;
  notes: string;
  concert_date: string | null;
  created_at: string;
  updated_at: string;
}

interface SetlistItemRow {
  id: string;
  setlist_id: string;
  position: number;
  kind: "song" | "pause";
  song_id: string | null;
  duration_seconds: number | null;
  title: string | null;
  artist: string | null;
  song_duration_seconds: number | null;
  tempo: number | null;
  artwork_url: string | null;
}

function loadSetlistItems(setlistIds: string[]): Map<string, SetlistItem[]> {
  const map = new Map<string, SetlistItem[]>();
  if (setlistIds.length === 0) return map;

  for (const id of setlistIds) {
    map.set(id, []);
  }

  const db = getDb();
  const placeholders = setlistIds.map(() => "?").join(", ");
  const rows = db
    .prepare(
      `SELECT si.id, si.setlist_id, si.position, si.kind, si.song_id, si.duration_seconds,
              s.title, s.artist, s.duration_seconds AS song_duration_seconds, s.tempo, s.artwork_url
       FROM setlist_items si
       LEFT JOIN songs s ON s.id = si.song_id
       WHERE si.setlist_id IN (${placeholders})
       ORDER BY si.position ASC`,
    )
    .all(...setlistIds) as SetlistItemRow[];

  for (const row of rows) {
    const list = map.get(row.setlist_id) ?? [];
    if (row.kind === "pause") {
      const pause: SetlistPauseItem = {
        kind: "pause",
        id: row.id,
        position: row.position,
        durationSeconds: row.duration_seconds ?? 0,
      };
      list.push(pause);
    } else if (row.song_id && row.title != null && row.song_duration_seconds != null && row.tempo != null) {
      const song: SetlistSongItem = {
        kind: "song",
        id: row.id,
        position: row.position,
        songId: row.song_id,
        title: row.title,
        artist: row.artist ?? "",
        durationSeconds: row.song_duration_seconds,
        tempo: row.tempo,
        ...(row.artwork_url ? { artworkUrl: row.artwork_url } : {}),
      };
      list.push(song);
    }
    map.set(row.setlist_id, list);
  }

  return map;
}

function itemsToSongRefs(items: SetlistItem[]): SetlistSongRef[] {
  return items
    .filter((item): item is SetlistSongItem => item.kind === "song")
    .map((item, index) => ({
      songId: item.songId,
      position: index,
      title: item.title,
      artist: item.artist,
      durationSeconds: item.durationSeconds,
      tempo: item.tempo,
      ...(item.artworkUrl ? { artworkUrl: item.artworkUrl } : {}),
    }));
}

function rowToSetlist(row: SetlistRow, items: SetlistItem[]): Setlist {
  const summary = summarizeSetlistDurations(items);
  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    ...(row.concert_date ? { concertDate: row.concert_date } : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
    songs: itemsToSongRefs(items),
    groups: summary.groups,
    estimatedDurationSeconds: summary.estimatedDurationSeconds,
    estimatedTotalSeconds: summary.estimatedTotalSeconds,
    pauseDurationSeconds: summary.pauseDurationSeconds,
  };
}

export function listSetlists(): Setlist[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id, name, notes, concert_date, created_at, updated_at
       FROM setlists
       ORDER BY updated_at DESC`,
    )
    .all() as SetlistRow[];

  const itemsBySetlist = loadSetlistItems(rows.map((row) => row.id));
  return rows.map((row) => rowToSetlist(row, itemsBySetlist.get(row.id) ?? []));
}

export function getSetlist(id: string): Setlist | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT id, name, notes, concert_date, created_at, updated_at
       FROM setlists WHERE id = ?`,
    )
    .get(id) as SetlistRow | undefined;

  if (!row) return null;
  const itemsBySetlist = loadSetlistItems([id]);
  return rowToSetlist(row, itemsBySetlist.get(id) ?? []);
}

function replaceSetlistItems(setlistId: string, items: SetlistItemInput[]): void {
  const db = getDb();

  const songIds = items
    .filter((item): item is Extract<SetlistItemInput, { kind: "song" }> => item.kind === "song")
    .map((item) => item.songId);

  if (songIds.length !== new Set(songIds).size) {
    throw new Error("DUPLICATE_SONG");
  }

  if (songIds.length > 0) {
    const placeholders = songIds.map(() => "?").join(", ");
    const found = db
      .prepare(`SELECT id FROM songs WHERE id IN (${placeholders})`)
      .all(...songIds) as { id: string }[];

    if (found.length !== songIds.length) {
      throw new Error("SONG_NOT_FOUND");
    }
  }

  db.prepare("DELETE FROM setlist_items WHERE setlist_id = ?").run(setlistId);
  // Legacy table kept in sync for older reads / rollback safety.
  db.prepare("DELETE FROM setlist_songs WHERE setlist_id = ?").run(setlistId);

  const insertItem = db.prepare(
    `INSERT INTO setlist_items (id, setlist_id, position, kind, song_id, duration_seconds)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertLegacy = db.prepare(
    `INSERT INTO setlist_songs (setlist_id, song_id, position) VALUES (?, ?, ?)`,
  );

  let legacyPosition = 0;
  items.forEach((item, position) => {
    const id = crypto.randomUUID();
    if (item.kind === "pause") {
      insertItem.run(id, setlistId, position, "pause", null, item.durationSeconds);
      return;
    }
    insertItem.run(id, setlistId, position, "song", item.songId, null);
    insertLegacy.run(setlistId, item.songId, legacyPosition);
    legacyPosition += 1;
  });
}

export function createSetlist(input: {
  name: string;
  notes?: string;
  concertDate?: string;
  items?: SetlistItemInput[];
}): Setlist {
  const db = getDb();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const notes = input.notes ?? "";
  const concertDate = input.concertDate ?? null;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO setlists (id, name, notes, concert_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, input.name, notes, concertDate, now, now);

    replaceSetlistItems(id, input.items ?? []);
  });

  tx();

  const setlist = getSetlist(id);
  if (!setlist) throw new Error("SETLIST_CREATE_FAILED");
  return setlist;
}

export function updateSetlist(input: {
  id: string;
  name: string;
  notes?: string;
  concertDate?: string | null;
  items: SetlistItemInput[];
}): Setlist {
  const db = getDb();
  const now = new Date().toISOString();
  const notes = input.notes ?? "";
  const concertDate =
    input.concertDate === undefined ? undefined : input.concertDate || null;

  const existing = getSetlist(input.id);
  if (!existing) throw new Error("SETLIST_NOT_FOUND");

  const tx = db.transaction(() => {
    if (concertDate === undefined) {
      db.prepare(
        `UPDATE setlists SET name = ?, notes = ?, updated_at = ? WHERE id = ?`,
      ).run(input.name, notes, now, input.id);
    } else {
      db.prepare(
        `UPDATE setlists SET name = ?, notes = ?, concert_date = ?, updated_at = ? WHERE id = ?`,
      ).run(input.name, notes, concertDate, now, input.id);
    }

    replaceSetlistItems(input.id, input.items);
  });

  tx();

  const setlist = getSetlist(input.id);
  if (!setlist) throw new Error("SETLIST_NOT_FOUND");
  return setlist;
}

export function deleteSetlist(id: string): void {
  const db = getDb();
  const result = db.prepare("DELETE FROM setlists WHERE id = ?").run(id);
  if (result.changes === 0) throw new Error("SETLIST_NOT_FOUND");
}
