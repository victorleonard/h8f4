import { timingSafeEqual } from "node:crypto";

function getAdminPassword(): string | undefined {
  return import.meta.env.PROPAL_ADMIN_PASSWORD ?? process.env.PROPAL_ADMIN_PASSWORD;
}

export function isAdminPasswordConfigured(): boolean {
  const password = getAdminPassword();
  return typeof password === "string" && password.length > 0;
}

export function verifyAdminPassword(password: unknown): boolean {
  const expected = getAdminPassword();
  if (!expected || typeof password !== "string") return false;

  const provided = Buffer.from(password);
  const reference = Buffer.from(expected);
  if (provided.length !== reference.length) return false;

  return timingSafeEqual(provided, reference);
}

export function assertAdminPassword(password: unknown): Response | null {
  if (!isAdminPasswordConfigured()) {
    return new Response(JSON.stringify({ error: "Administration non configurée." }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!verifyAdminPassword(password)) {
    return new Response(JSON.stringify({ error: "Mot de passe admin incorrect." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  return null;
}
