import type { APIRoute } from "astro";
import {
  errorResponse,
  jsonResponse,
  normalizeArtworkUrl,
  parseJsonBody,
  validateArtist,
  validateDurationSeconds,
  validateTempo,
  validateTitle,
} from "../../../lib/api-utils";
import { isValidArtworkUrl } from "../../../lib/itunes-artwork";
import { createSong, deleteSong, listSongs, updateSong } from "../../../lib/songs-store";
import { listSetlists } from "../../../lib/setlists-store";

export const prerender = false;

function listPayload() {
  return { songs: listSongs(), setlists: listSetlists() };
}

function parseArtwork(value: unknown): { ok: true; artworkUrl?: string } | { ok: false; error: string } {
  const artworkUrl = normalizeArtworkUrl(value);
  if (artworkUrl && !isValidArtworkUrl(artworkUrl)) {
    return { ok: false, error: "URL de pochette invalide." };
  }
  return { ok: true, ...(artworkUrl ? { artworkUrl } : {}) };
}

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    title?: unknown;
    artist?: unknown;
    durationSeconds?: unknown;
    tempo?: unknown;
    artworkUrl?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (!validateTitle(body.title)) {
    return errorResponse("Le titre doit contenir entre 2 et 120 caractères.", 400);
  }
  if (!validateArtist(body.artist ?? "")) {
    return errorResponse("L'artiste ne doit pas dépasser 120 caractères.", 400);
  }
  if (!validateDurationSeconds(body.durationSeconds)) {
    return errorResponse("La durée doit être un entier entre 1 et 1800 secondes.", 400);
  }
  if (!validateTempo(body.tempo)) {
    return errorResponse("Le tempo doit être un entier entre 40 et 300 BPM.", 400);
  }

  const artwork = parseArtwork(body.artworkUrl);
  if (!artwork.ok) return errorResponse(artwork.error, 400);

  try {
    const song = createSong({
      title: body.title.trim(),
      artist: typeof body.artist === "string" ? body.artist.trim() : "",
      durationSeconds: body.durationSeconds,
      tempo: body.tempo,
      ...(artwork.artworkUrl ? { artworkUrl: artwork.artworkUrl } : {}),
    });
    return jsonResponse({ song, ...listPayload() }, 201);
  } catch (error) {
    console.error("[setlist songs POST]", error);
    return errorResponse("Impossible d'ajouter le titre.", 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    id?: unknown;
    title?: unknown;
    artist?: unknown;
    durationSeconds?: unknown;
    tempo?: unknown;
    artworkUrl?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (typeof body.id !== "string" || !body.id) {
    return errorResponse("Identifiant du titre manquant.", 400);
  }
  if (!validateTitle(body.title)) {
    return errorResponse("Le titre doit contenir entre 2 et 120 caractères.", 400);
  }
  if (!validateArtist(body.artist ?? "")) {
    return errorResponse("L'artiste ne doit pas dépasser 120 caractères.", 400);
  }
  if (!validateDurationSeconds(body.durationSeconds)) {
    return errorResponse("La durée doit être un entier entre 1 et 1800 secondes.", 400);
  }
  if (!validateTempo(body.tempo)) {
    return errorResponse("Le tempo doit être un entier entre 40 et 300 BPM.", 400);
  }

  const artwork = parseArtwork(body.artworkUrl);
  if (!artwork.ok) return errorResponse(artwork.error, 400);

  try {
    const song = updateSong({
      id: body.id,
      title: body.title.trim(),
      artist: typeof body.artist === "string" ? body.artist.trim() : "",
      durationSeconds: body.durationSeconds,
      tempo: body.tempo,
      artworkUrl: artwork.artworkUrl ?? null,
    });
    return jsonResponse({ song, ...listPayload() });
  } catch (error) {
    if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
      return errorResponse("Titre introuvable.", 404);
    }
    console.error("[setlist songs PATCH]", error);
    return errorResponse("Impossible de modifier le titre.", 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    id?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (typeof body.id !== "string" || !body.id) {
    return errorResponse("Identifiant du titre manquant.", 400);
  }

  try {
    deleteSong(body.id);
    return jsonResponse(listPayload());
  } catch (error) {
    if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
      return errorResponse("Titre introuvable.", 404);
    }
    console.error("[setlist songs DELETE]", error);
    return errorResponse("Impossible de supprimer le titre.", 500);
  }
};
