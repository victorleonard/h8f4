import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "../../../lib/api-utils";
import { listProposals } from "../../../lib/propal-store";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data = await listProposals();
    return jsonResponse(data);
  } catch (error) {
    console.error("[propal GET]", error);
    return errorResponse("Impossible de charger les propositions.", 500);
  }
};
