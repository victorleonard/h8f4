import type { APIRoute } from "astro";
import {
  errorResponse,
  jsonResponse,
  parseJsonBody,
  slugifyMemberLabel,
  validateMemberLabel,
  validateMemberSlug,
} from "../../../lib/api-utils";
import { assertAdminPassword } from "../../../lib/propal-admin-auth";
import { createMember, deleteMember, listMembers, updateMember } from "../../../lib/propal-members-store";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    adminPassword?: unknown;
    id?: unknown;
    label?: unknown;
  }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  const denied = assertAdminPassword(body.adminPassword);
  if (denied) return denied;

  if (!validateMemberLabel(body.label)) {
    return errorResponse("Le prénom doit contenir entre 2 et 40 caractères.", 400);
  }

  const label = body.label.trim();
  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim().toLowerCase()
      : slugifyMemberLabel(label);

  if (!validateMemberSlug(id)) {
    return errorResponse(
      "Identifiant invalide (2–32 caractères, minuscules, chiffres, tirets ou underscores).",
      400,
    );
  }

  try {
    const member = await createMember({ id, label });
    const members = await listMembers();
    return jsonResponse({ member, members }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_EXISTS") {
      return errorResponse("Un membre avec cet identifiant existe déjà.", 409);
    }
    console.error("[propal members POST]", error);
    return errorResponse("Impossible d'ajouter le membre.", 500);
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    adminPassword?: unknown;
    targetId?: unknown;
    label?: unknown;
  }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  const denied = assertAdminPassword(body.adminPassword);
  if (denied) return denied;

  if (typeof body.targetId !== "string" || !body.targetId) {
    return errorResponse("Identifiant du membre manquant.", 400);
  }

  if (!validateMemberLabel(body.label)) {
    return errorResponse("Le prénom doit contenir entre 2 et 40 caractères.", 400);
  }

  try {
    const member = await updateMember({ id: body.targetId, label: body.label.trim() });
    const members = await listMembers();
    return jsonResponse({ member, members });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return errorResponse("Membre introuvable.", 404);
    }
    console.error("[propal members PATCH]", error);
    return errorResponse("Impossible de modifier le membre.", 500);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const body = await parseJsonBody<{
    adminPassword?: unknown;
    targetId?: unknown;
  }>(request);

  if (!body) {
    return errorResponse("Corps de requête invalide.", 400);
  }

  const denied = assertAdminPassword(body.adminPassword);
  if (denied) return denied;

  if (typeof body.targetId !== "string" || !body.targetId) {
    return errorResponse("Identifiant du membre manquant.", 400);
  }

  try {
    await deleteMember(body.targetId);
    const members = await listMembers();
    return jsonResponse({ members });
  } catch (error) {
    if (error instanceof Error && error.message === "MEMBER_NOT_FOUND") {
      return errorResponse("Membre introuvable.", 404);
    }
    console.error("[propal members DELETE]", error);
    return errorResponse("Impossible de supprimer le membre.", 500);
  }
};
