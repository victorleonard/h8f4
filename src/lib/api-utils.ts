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
