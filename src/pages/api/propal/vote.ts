import type { APIRoute } from "astro";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  validateMemberId,
} from "../../../lib/api-utils";
import { rateProposal, removeRating } from "../../../lib/propal-store";

export const prerender = false;

function validateRating(rating: unknown): rating is number {
  return (
    typeof rating === "number" &&
    Number.isInteger(rating) &&
    rating >= 1 &&
    rating <= 5
  );
}

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    proposalId?: unknown;
    memberId?: unknown;
    rating?: unknown;
    action?: unknown;
  }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  if (!(await validateMemberId(body.memberId))) {
    return errorResponse("Compte membre invalide.", 400);
  }

  if (typeof body.proposalId !== "string" || !body.proposalId) {
    return errorResponse("Identifiant de proposition manquant.", 400);
  }

  try {
    if (body.action === "remove") {
      const data = await removeRating({
        proposalId: body.proposalId,
        memberId: body.memberId,
      });
      return jsonResponse(data);
    }

    if (!validateRating(body.rating)) {
      return errorResponse("La note doit être un entier entre 1 et 5.", 400);
    }

    const data = await rateProposal({
      proposalId: body.proposalId,
      memberId: body.memberId,
      rating: body.rating,
    });
    return jsonResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PROPOSAL_NOT_FOUND") {
        return errorResponse("Proposition introuvable.", 404);
      }
    }
    console.error("[propal vote POST]", error);
    return errorResponse("Impossible d'enregistrer la note.", 500);
  }
};
