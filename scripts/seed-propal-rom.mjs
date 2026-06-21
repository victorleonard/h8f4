import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";

const MEMBER_ID = "rom";
const PROPOSALS_KEY = "propal:proposals";
const proposalKey = (id) => `propal:item:${id}`;

const TRACKS = [
  { artist: "Volbeat", title: "Temple Of Ekur" },
  { artist: "Those Damn Crows", title: "Sin On Skin" },
  { artist: "Pearl Jam", title: "I Am Mine" },
  { artist: "Queens of the Stone Age", title: "Go With The Flow" },
  { artist: "Linkin Park", title: "In The End" },
  { artist: "Nickelback", title: "How You Remind Me" },
  { artist: "Red Hot Chili Peppers", title: "Parallel Universe" },
  { artist: "Audioslave", title: "Show Me How To Live" },
  { artist: "Tenacious D", title: "Baby One More Time" },
  { artist: "The Offspring", title: "The Kids Aren't Alright" },
  { artist: "Sum 41", title: "Still Waiting" },
  { artist: "Snap!", title: "The Power" },
  { artist: "Biffy Clyro", title: "Bubbles" },
];

function loadEnv() {
  return Object.fromEntries(
    readFileSync(".env", "utf8")
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

function buildSearchUrl(service, title, artist) {
  const query = encodeURIComponent([title, artist].filter(Boolean).join(" "));
  if (service === "spotify") return `https://open.spotify.com/search/${query}`;
  if (service === "deezer") return `https://www.deezer.com/search/${query}`;
  return `https://www.youtube.com/results?search_query=${query}`;
}

async function fetchDeezerTrackUrl(title, artist) {
  const q = artist ? `artist:"${artist}" track:"${title}"` : `track:"${title}"`;
  const response = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=1`);
  if (!response.ok) return null;
  const data = await response.json();
  return data.data?.[0]?.link ?? null;
}

async function fetchItunesArtwork(title, artist) {
  const itunesUrl = new URL("https://itunes.apple.com/search");
  itunesUrl.searchParams.set("term", `${artist} ${title}`);
  itunesUrl.searchParams.set("entity", "song");
  itunesUrl.searchParams.set("limit", "1");
  itunesUrl.searchParams.set("country", "FR");

  const response = await fetch(itunesUrl);
  if (!response.ok) return undefined;

  const data = await response.json();
  const artwork = data.results?.[0]?.artworkUrl100;
  return artwork ? artwork.replace("100x100bb", "200x200bb") : undefined;
}

async function createProposal(redis, { title, artist }) {
  const [deezerUrl, artworkUrl] = await Promise.all([
    fetchDeezerTrackUrl(title, artist).catch(() => null),
    fetchItunesArtwork(title, artist).catch(() => undefined),
  ]);

  const id = randomUUID();
  const proposal = {
    id,
    title,
    artist,
    proposedBy: MEMBER_ID,
    createdAt: new Date().toISOString(),
    spotifyUrl: buildSearchUrl("spotify", title, artist),
    deezerUrl: deezerUrl ?? buildSearchUrl("deezer", title, artist),
    youtubeUrl: buildSearchUrl("youtube", title, artist),
    ...(artworkUrl ? { artworkUrl } : {}),
  };

  await redis.set(proposalKey(id), JSON.stringify(proposal));
  await redis.zadd(PROPOSALS_KEY, { score: 0, member: id });
  return proposal;
}

const env = loadEnv();
const redis = new Redis({
  url: env.UPSTASH_REDIS_REST_URL,
  token: env.UPSTASH_REDIS_REST_TOKEN,
});

const existingIds = (await redis.zrange(PROPOSALS_KEY, 0, -1)) ?? [];
const existing = new Set();

for (const id of existingIds) {
  const raw = await redis.get(proposalKey(id));
  if (!raw) continue;
  const proposal = typeof raw === "string" ? JSON.parse(raw) : raw;
  existing.add(`${proposal.artist.toLowerCase()}|${proposal.title.toLowerCase()}`);
}

let created = 0;
let skipped = 0;

for (const track of TRACKS) {
  const key = `${track.artist.toLowerCase()}|${track.title.toLowerCase()}`;
  if (existing.has(key)) {
    console.log(`Ignoré (déjà présent) : ${track.artist} — ${track.title}`);
    skipped += 1;
    continue;
  }

  const proposal = await createProposal(redis, track);
  console.log(`Ajouté : ${proposal.artist} — ${proposal.title}`);
  created += 1;
}

console.log(`\nTerminé : ${created} créée(s), ${skipped} ignorée(s).`);
