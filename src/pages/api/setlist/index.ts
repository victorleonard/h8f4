import type { APIRoute } from "astro";
import { errorResponse, jsonResponse } from "../../../lib/api-utils";
import { listSetlists } from "../../../lib/setlists-store";
import { listSongs } from "../../../lib/songs-store";
import type { SetlistListResponse } from "../../../lib/setlist-types";

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const data: SetlistListResponse = {
      songs: listSongs(),
      setlists: listSetlists(),
    };
    return jsonResponse(data);
  } catch (error) {
    console.error("[setlist GET]", error);
    return errorResponse("Impossible de charger le répertoire et les setlists.", 500);
  }
};
