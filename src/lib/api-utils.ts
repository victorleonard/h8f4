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
