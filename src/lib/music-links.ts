export interface MusicLinks {
  spotifyUrl: string;
  deezerUrl: string;
  youtubeUrl: string;
}

interface DeezerSearchResponse {
  data?: { link?: string }[];
}

interface SpotifyTokenResponse {
  access_token?: string;
  expires_in?: number;
}

interface SpotifySearchResponse {
  tracks?: { items?: { external_urls?: { spotify?: string } }[] };
}

interface YouTubeSearchResponse {
  items?: { id?: { videoId?: string } }[];
}

let spotifyToken: { value: string; expiresAt: number } | null = null;

export function buildSpotifySearchUrl(title: string, artist: string): string {
  const query = [title, artist].filter(Boolean).join(" ");
  return `https://open.spotify.com/search/${encodeURIComponent(query)}`;
}

export function buildDeezerSearchUrl(title: string, artist: string): string {
  const query = [title, artist].filter(Boolean).join(" ");
  return `https://www.deezer.com/search/${encodeURIComponent(query)}`;
}

export function buildYouTubeSearchUrl(title: string, artist: string): string {
  const query = [title, artist].filter(Boolean).join(" ");
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

export function isValidStreamingUrl(
  url: string,
  service: "spotify" | "deezer" | "youtube",
): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (service === "spotify") return host === "open.spotify.com";
    if (service === "deezer") return host === "deezer.com";
    return host === "youtube.com" || host === "youtu.be" || host === "music.youtube.com";
  } catch {
    return false;
  }
}

async function fetchDeezerTrackUrl(title: string, artist: string): Promise<string | null> {
  const q = artist ? `artist:"${artist}" track:"${title}"` : `track:"${title}"`;
  const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as DeezerSearchResponse;
  const link = data.data?.[0]?.link;
  return link && isValidStreamingUrl(link, "deezer") ? link : null;
}

async function getSpotifyAccessToken(): Promise<string | null> {
  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (spotifyToken && spotifyToken.expiresAt > Date.now()) {
    return spotifyToken.value;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as SpotifyTokenResponse;
  if (!data.access_token) return null;

  spotifyToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 - 60_000,
  };

  return spotifyToken.value;
}

async function fetchSpotifyTrackUrl(title: string, artist: string): Promise<string | null> {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  const query = artist ? `track:${title} artist:${artist}` : `track:${title}`;
  const response = await fetch(
    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as SpotifySearchResponse;
  const link = data.tracks?.items?.[0]?.external_urls?.spotify;
  return link && isValidStreamingUrl(link, "spotify") ? link : null;
}

async function fetchYouTubeVideoUrl(title: string, artist: string): Promise<string | null> {
  const apiKey = import.meta.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;

  const query = [title, artist].filter(Boolean).join(" ");
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", query);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "1");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) return null;

  const data = (await response.json()) as YouTubeSearchResponse;
  const videoId = data.items?.[0]?.id?.videoId;
  if (!videoId) return null;

  const link = `https://www.youtube.com/watch?v=${videoId}`;
  return isValidStreamingUrl(link, "youtube") ? link : null;
}

export async function resolveMusicLinks(title: string, artist: string): Promise<MusicLinks> {
  const [deezerTrack, spotifyTrack, youtubeVideo] = await Promise.all([
    fetchDeezerTrackUrl(title, artist).catch(() => null),
    fetchSpotifyTrackUrl(title, artist).catch(() => null),
    fetchYouTubeVideoUrl(title, artist).catch(() => null),
  ]);

  return {
    deezerUrl: deezerTrack ?? buildDeezerSearchUrl(title, artist),
    spotifyUrl: spotifyTrack ?? buildSpotifySearchUrl(title, artist),
    youtubeUrl: youtubeVideo ?? buildYouTubeSearchUrl(title, artist),
  };
}

export function getProposalMusicLinks(proposal: {
  title: string;
  artist: string;
  spotifyUrl?: string;
  deezerUrl?: string;
  youtubeUrl?: string;
}): MusicLinks {
  return {
    spotifyUrl:
      proposal.spotifyUrl && isValidStreamingUrl(proposal.spotifyUrl, "spotify")
        ? proposal.spotifyUrl
        : buildSpotifySearchUrl(proposal.title, proposal.artist),
    deezerUrl:
      proposal.deezerUrl && isValidStreamingUrl(proposal.deezerUrl, "deezer")
        ? proposal.deezerUrl
        : buildDeezerSearchUrl(proposal.title, proposal.artist),
    youtubeUrl:
      proposal.youtubeUrl && isValidStreamingUrl(proposal.youtubeUrl, "youtube")
        ? proposal.youtubeUrl
        : buildYouTubeSearchUrl(proposal.title, proposal.artist),
  };
}
