import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "../../../lib/api-utils";
import { listProposals } from "../../../lib/propal-store";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data = await listProposals();
    return jsonResponse(data);
  } catch (error) {
    if (error instanceof Error && error.message === "REDIS_NOT_CONFIGURED") {
      return errorResponse("Stockage non configuré (Upstash Redis).", 503);
    }
    console.error("[propal GET]", error);
    return errorResponse("Impossible de charger les propositions.", 500);
  }
};
