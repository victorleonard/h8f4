import { memberExists } from "./propal-members-store";

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

export async function parseJsonBody<T extends Record<string, unknown>>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export async function validateMemberId(memberId: unknown): Promise<memberId is string> {
  return typeof memberId === "string" && (await memberExists(memberId));
}

export function validateTitle(title: unknown): title is string {
  return typeof title === "string" && title.trim().length >= 2 && title.trim().length <= 120;
}

export function validateArtist(artist: unknown): artist is string {
  return typeof artist === "string" && artist.trim().length <= 120;
}

export function normalizeArtworkUrl(artworkUrl: unknown): string | undefined {
  if (typeof artworkUrl !== "string") return undefined;
  const trimmed = artworkUrl.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

export function validateMemberSlug(id: unknown): id is string {
  return typeof id === "string" && /^[a-z][a-z0-9_-]{1,31}$/.test(id);
}

export function validateMemberLabel(label: unknown): label is string {
  return typeof label === "string" && label.trim().length >= 2 && label.trim().length <= 40;
}

export function slugifyMemberLabel(label: string): string {
  return label
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

/** Durée d'un titre : 1 s à 30 min. */
export function validateDurationSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 1800;
}

/** Tempo en BPM : 40–300. */
export function validateTempo(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 40 && value <= 300;
}

export function validateSetlistName(name: unknown): name is string {
  return typeof name === "string" && name.trim().length >= 2 && name.trim().length <= 120;
}

export function validateSetlistNotes(notes: unknown): notes is string {
  return typeof notes === "string" && notes.length <= 1000;
}

/** Date de concert optionnelle (YYYY-MM-DD). */
export function normalizeConcertDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return undefined;
  const date = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return undefined;
  return trimmed;
}

export function validateSongIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every((id) => typeof id === "string" && id.length > 0) &&
    new Set(value).size === value.length
  );
}

/** Durée d'une pause : 1 min à 90 min. */
export function validatePauseDurationSeconds(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 60 && value <= 5400;
}

export function validateSetlistItems(
  value: unknown,
): value is Array<{ kind: "song"; songId: string } | { kind: "pause"; durationSeconds: number }> {
  if (!Array.isArray(value)) return false;

  const songIds: string[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const record = item as Record<string, unknown>;
    if (record.kind === "song") {
      if (typeof record.songId !== "string" || !record.songId) return false;
      songIds.push(record.songId);
      continue;
    }
    if (record.kind === "pause") {
      if (!validatePauseDurationSeconds(record.durationSeconds)) return false;
      continue;
    }
    return false;
  }

  return new Set(songIds).size === songIds.length;
}

/** Accepte `items` ou l’ancien format `songIds`. */
export function normalizeSetlistItemsInput(body: {
  items?: unknown;
  songIds?: unknown;
}):
  | { ok: true; items: Array<{ kind: "song"; songId: string } | { kind: "pause"; durationSeconds: number }> }
  | { ok: false; error: string } {
  if (body.items !== undefined) {
    if (!validateSetlistItems(body.items)) {
      return {
        ok: false,
        error: "Liste d’éléments invalide (titres uniques, pauses entre 1 et 90 min).",
      };
    }
    return { ok: true, items: body.items };
  }

  if (body.songIds !== undefined) {
    if (!validateSongIds(body.songIds)) {
      return { ok: false, error: "Liste de titres invalide (identifiants uniques requis)." };
    }
    return {
      ok: true,
      items: body.songIds.map((songId) => ({ kind: "song" as const, songId })),
    };
  }

  return { ok: true, items: [] };
}
