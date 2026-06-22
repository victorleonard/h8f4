import type { APIRoute } from "astro";
import { errorResponse, jsonResponse, parseJsonBody } from "../../../../lib/api-utils";
import { assertAdminPassword } from "../../../../lib/propal-admin-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{ password?: unknown }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  const denied = assertAdminPassword(body.password);
  if (denied) return denied;

  return jsonResponse({ ok: true });
};
