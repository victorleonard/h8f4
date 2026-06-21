/** Agrandit une URL de pochette iTunes (ex. 100x100 → 200x200). */
export function resizeArtworkUrl(url: string, size = 200): string {
  return url.replace(/(\d+)x(\d+)(bb\.jpg)/i, `${size}x${size}$3`);
}

export function isValidArtworkUrl(url: string): boolean {
  if (!url.startsWith("https://") || url.length > 500) return false;
  try {
    const host = new URL(url).hostname;
    return host.endsWith("mzstatic.com") || host.endsWith("apple.com");
  } catch {
    return false;
  }
}
