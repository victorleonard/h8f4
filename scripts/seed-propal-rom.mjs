import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const MEMBER_ID = "rom";
const schemaPath = join(fileURLToPath(new URL("./propal-schema.sql", import.meta.url)));

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

async function createProposal(db, { title, artist }) {
  const [deezerUrl, artworkUrl] = await Promise.all([
    fetchDeezerTrackUrl(title, artist).catch(() => null),
    fetchItunesArtwork(title, artist).catch(() => undefined),
  ]);

  const id = randomUUID();
  db.prepare(
    `INSERT INTO proposals (
      id, title, artist, proposed_by, created_at,
      artwork_url, spotify_url, deezer_url, youtube_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    title,
    artist,
    MEMBER_ID,
    new Date().toISOString(),
    artworkUrl ?? null,
    buildSearchUrl("spotify", title, artist),
    deezerUrl ?? buildSearchUrl("deezer", title, artist),
    buildSearchUrl("youtube", title, artist),
  );

  return { id, title, artist };
}

const dbPath = process.env.PROPAL_DB_PATH ?? "./data/propal.db";
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(readFileSync(schemaPath, "utf8"));

const member = db.prepare("SELECT 1 AS ok FROM members WHERE id = ?").get(MEMBER_ID);
if (!member) {
  console.error(`Le membre "${MEMBER_ID}" n'existe pas. Lancez d'abord : npm run seed:propal-members`);
  process.exit(1);
}

const existing = new Set(
  db
    .prepare("SELECT lower(artist) AS artist, lower(title) AS title FROM proposals")
    .all()
    .map((row) => `${row.artist}|${row.title}`),
);

let created = 0;
let skipped = 0;

for (const track of TRACKS) {
  const key = `${track.artist.toLowerCase()}|${track.title.toLowerCase()}`;
  if (existing.has(key)) {
    console.log(`Ignoré (déjà présent) : ${track.artist} — ${track.title}`);
    skipped += 1;
    continue;
  }

  const proposal = await createProposal(db, track);
  console.log(`Ajouté : ${proposal.artist} — ${proposal.title}`);
  created += 1;
}

console.log(`\nTerminé : ${created} créée(s), ${skipped} ignorée(s).`);
