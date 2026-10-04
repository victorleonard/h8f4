import type { APIRoute } from "astro";
import {
  errorResponse,
  jsonResponse,
  normalizeConcertDate,
  normalizeSetlistItemsInput,
  parseJsonBody,
  validateSetlistName,
  validateSetlistNotes,
} from "../../../lib/api-utils";
import { createSetlist, deleteSetlist, listSetlists, updateSetlist } from "../../../lib/setlists-store";
import { listSongs } from "../../../lib/songs-store";

export const prerender = false;

function listPayload() {
  return { songs: listSongs(), setlists: listSetlists() };
}

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    name?: unknown;
    notes?: unknown;
    concertDate?: unknown;
    items?: unknown;
    songIds?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (!validateSetlistName(body.name)) {
    return errorResponse("Le nom de la setlist doit contenir entre 2 et 120 caractères.", 400);
  }

  const notes = body.notes ?? "";
  if (!validateSetlistNotes(notes)) {
    return errorResponse("Les notes ne doivent pas dépasser 1000 caractères.", 400);
  }

  const concertDate = normalizeConcertDate(body.concertDate ?? null);
  if (body.concertDate !== undefined && body.concertDate !== null && body.concertDate !== "" && concertDate === undefined) {
    return errorResponse("Date de concert invalide (format attendu : AAAA-MM-JJ).", 400);
  }

  const normalized = normalizeSetlistItemsInput(body);
  if (!normalized.ok) return errorResponse(normalized.error, 400);

  try {
    const setlist = createSetlist({
      name: body.name.trim(),
      notes: typeof notes === "string" ? notes.trim() : "",
      ...(concertDate ? { concertDate } : {}),
      items: normalized.items,
    });
    return jsonResponse({ setlist, ...listPayload() }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
      return errorResponse("Un ou plusieurs titres sont introuvables.", 400);
    }
    if (error instanceof Error && error.message === "DUPLICATE_SONG") {
      return errorResponse("Un titre ne peut apparaître qu’une fois dans la setlist.", 400);
    }
    console.error("[setlist setlists POST]", error);
    return errorResponse("Impossible de créer la setlist.", 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    id?: unknown;
    name?: unknown;
    notes?: unknown;
    concertDate?: unknown;
    items?: unknown;
    songIds?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (typeof body.id !== "string" || !body.id) {
    return errorResponse("Identifiant de la setlist manquant.", 400);
  }
  if (!validateSetlistName(body.name)) {
    return errorResponse("Le nom de la setlist doit contenir entre 2 et 120 caractères.", 400);
  }

  const notes = body.notes ?? "";
  if (!validateSetlistNotes(notes)) {
    return errorResponse("Les notes ne doivent pas dépasser 1000 caractères.", 400);
  }

  const concertDate = normalizeConcertDate(body.concertDate);
  if (body.concertDate !== undefined && concertDate === undefined) {
    return errorResponse("Date de concert invalide (format attendu : AAAA-MM-JJ).", 400);
  }

  if (body.items === undefined && body.songIds === undefined) {
    return errorResponse("Liste d’éléments manquante (items ou songIds).", 400);
  }

  const normalized = normalizeSetlistItemsInput(body);
  if (!normalized.ok) return errorResponse(normalized.error, 400);

  try {
    const setlist = updateSetlist({
      id: body.id,
      name: body.name.trim(),
      notes: typeof notes === "string" ? notes.trim() : "",
      concertDate: concertDate ?? null,
      items: normalized.items,
    });
    return jsonResponse({ setlist, ...listPayload() });
  } catch (error) {
    if (error instanceof Error && error.message === "SETLIST_NOT_FOUND") {
      return errorResponse("Setlist introuvable.", 404);
    }
    if (error instanceof Error && error.message === "SONG_NOT_FOUND") {
      return errorResponse("Un ou plusieurs titres sont introuvables.", 400);
    }
    if (error instanceof Error && error.message === "DUPLICATE_SONG") {
      return errorResponse("Un titre ne peut apparaître qu’une fois dans la setlist.", 400);
    }
    console.error("[setlist setlists PATCH]", error);
    return errorResponse("Impossible de modifier la setlist.", 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    id?: unknown;
  }>(request);

  if (!body) return errorResponse("Corps de requête invalide.", 400);

  if (typeof body.id !== "string" || !body.id) {
    return errorResponse("Identifiant de la setlist manquant.", 400);
  }

  try {
    deleteSetlist(body.id);
    return jsonResponse(listPayload());
  } catch (error) {
    if (error instanceof Error && error.message === "SETLIST_NOT_FOUND") {
      return errorResponse("Setlist introuvable.", 404);
    }
    console.error("[setlist setlists DELETE]", error);
    return errorResponse("Impossible de supprimer la setlist.", 500);
  }
};
