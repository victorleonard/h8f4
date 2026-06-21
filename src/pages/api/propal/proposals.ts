import type { APIRoute } from "astro";
import {
  errorResponse,
  jsonResponse,
  normalizeArtworkUrl,
  parseJsonBody,
  validateArtist,
  validateMemberId,
  validateTitle,
} from "../../../lib/api-utils";
import { isValidArtworkUrl } from "../../../lib/itunes-artwork";
import { createProposal, deleteProposal } from "../../../lib/propal-store";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    title?: unknown;
    artist?: unknown;
    memberId?: unknown;
    artworkUrl?: unknown;
  }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  if (!(await validateMemberId(body.memberId))) {
    return errorResponse("Compte membre invalide.", 400);
  }

  if (!validateTitle(body.title)) {
    return errorResponse("Le titre doit contenir entre 2 et 120 caractères.", 400);
  }

  if (!validateArtist(body.artist ?? "")) {
    return errorResponse("L'artiste ne peut pas dépasser 120 caractères.", 400);
  }

  const artworkUrl = normalizeArtworkUrl(body.artworkUrl);
  if (artworkUrl && !isValidArtworkUrl(artworkUrl)) {
    return errorResponse("URL de pochette invalide.", 400);
  }

  try {
    const proposal = await createProposal({
      title: body.title,
      artist: typeof body.artist === "string" ? body.artist : "",
      proposedBy: body.memberId,
      artworkUrl,
    });
    return jsonResponse(proposal, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "REDIS_NOT_CONFIGURED") {
      return errorResponse("Stockage non configuré (Upstash Redis).", 503);
    }
    console.error("[propal POST]", error);
    return errorResponse("Impossible d'enregistrer la proposition.", 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    id?: unknown;
    memberId?: unknown;
  }>(request);

  if (!body || typeof body.id !== "string" || !body.id) {
    return errorResponse("Identifiant de proposition manquant.", 400);
  }

  if (!(await validateMemberId(body.memberId))) {
    return errorResponse("Compte membre invalide.", 400);
  }

  try {
    const data = await deleteProposal({
      proposalId: body.id,
      memberId: body.memberId,
    });
    return jsonResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "REDIS_NOT_CONFIGURED") {
        return errorResponse("Stockage non configuré (Upstash Redis).", 503);
      }
      if (error.message === "PROPOSAL_NOT_FOUND") {
        return errorResponse("Proposition introuvable.", 404);
      }
      if (error.message === "FORBIDDEN") {
        return errorResponse("Seul l'auteur peut supprimer cette proposition.", 403);
      }
    }
    console.error("[propal DELETE]", error);
    return errorResponse("Impossible de supprimer la proposition.", 500);
  }
};
