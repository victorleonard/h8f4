import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "../../../lib/api-utils";
import { resizeArtworkUrl } from "../../../lib/itunes-artwork";

export const prerender = false;

interface ItunesTrack {
  trackName?: string;
  artistName?: string;
  collectionName?: string;
  artworkUrl100?: string;
  artworkUrl60?: string;
}

export interface SongSearchResult {
  title: string;
  artist: string;
  album: string;
  artworkUrl?: string;
}

function dedupeResults(tracks: SongSearchResult[]): SongSearchResult[] {
  const seen = new Set<string>();
  const results: SongSearchResult[] = [];

  for (const track of tracks) {
    const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(track);
  }

  return results;
}

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q")?.trim() ?? "";

  if (query.length < 2) {
    return jsonResponse({ results: [] as SongSearchResult[] });
  }

  if (query.length > 120) {
    return errorResponse("Recherche trop longue.", 400);
  }

  try {
    const itunesUrl = new URL("https://itunes.apple.com/search");
    itunesUrl.searchParams.set("term", query);
    itunesUrl.searchParams.set("entity", "song");
    itunesUrl.searchParams.set("limit", "12");
    itunesUrl.searchParams.set("country", "FR");
    itunesUrl.searchParams.set("lang", "fr_fr");

    const response = await fetch(itunesUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      return errorResponse("Recherche indisponible pour le moment.", 502);
    }

    const data = (await response.json()) as { results?: ItunesTrack[] };
    const results = dedupeResults(
      (data.results ?? [])
        .filter((track) => track.trackName && track.artistName)
        .map((track) => {
          const rawArtwork = track.artworkUrl100 ?? track.artworkUrl60;
          return {
            title: track.trackName!.trim(),
            artist: track.artistName!.trim(),
            album: track.collectionName?.trim() ?? "",
            ...(rawArtwork
              ? { artworkUrl: resizeArtworkUrl(rawArtwork, 200) }
              : {}),
          };
        }),
    ).slice(0, 8);

    return jsonResponse({ results });
  } catch (error) {
    console.error("[propal search GET]", error);
    return errorResponse("Recherche impossible.", 500);
  }
};
