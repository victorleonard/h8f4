import { getMemberMap, listMembers } from "./propal-members-store";
import { getDb } from "./db";
import { resolveMusicLinks } from "./music-links";
import type { PropalListResponse, PropalProposal, PropalProposalView, PropalRating } from "./propal-types";

interface ProposalRow {
  id: string;
  title: string;
  artist: string;
  proposed_by: string;
  created_at: string;
  artwork_url: string | null;
  spotify_url: string | null;
  deezer_url: string | null;
  youtube_url: string | null;
  average_rating: number;
  rating_count: number;
}

interface RatingRow {
  proposal_id: string;
  member_id: string;
  score: number;
}

function rowToProposal(row: ProposalRow): PropalProposal {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    proposedBy: row.proposed_by,
    createdAt: row.created_at,
    ...(row.artwork_url ? { artworkUrl: row.artwork_url } : {}),
    ...(row.spotify_url ? { spotifyUrl: row.spotify_url } : {}),
    ...(row.deezer_url ? { deezerUrl: row.deezer_url } : {}),
    ...(row.youtube_url ? { youtubeUrl: row.youtube_url } : {}),
  };
}

function buildRatingStats(
  ratings: Map<string, number>,
  memberLabels: Map<string, string>,
): { averageRating: number; ratingCount: number; ratings: PropalRating[] } {
  const entries = [...ratings.entries()];
  const ratingCount = entries.length;
  const averageRating = ratingCount
    ? entries.reduce((sum, [, score]) => sum + score, 0) / ratingCount
    : 0;

  const ratingList: PropalRating[] = entries
    .map(([memberId, score]) => ({
      memberId,
      label: memberLabels.get(memberId) ?? memberId,
      score,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "fr"));

  return { averageRating, ratingCount, ratings: ratingList };
}

function toView(
  proposal: PropalProposal,
  ratings: Map<string, number>,
  memberLabels: Map<string, string>,
): PropalProposalView {
  const stats = buildRatingStats(ratings, memberLabels);

  return {
    ...proposal,
    ...stats,
    proposedByLabel: memberLabels.get(proposal.proposedBy) ?? proposal.proposedBy,
  };
}

function sortProposals(proposals: PropalProposalView[]): PropalProposalView[] {
  return [...proposals].sort((a, b) => {
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function loadRatingsByProposal(db: ReturnType<typeof getDb>, proposalIds: string[]): Map<string, Map<string, number>> {
  const result = new Map<string, Map<string, number>>();
  if (proposalIds.length === 0) return result;

  const placeholders = proposalIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`SELECT proposal_id, member_id, score FROM ratings WHERE proposal_id IN (${placeholders})`)
    .all(...proposalIds) as RatingRow[];

  for (const row of rows) {
    if (!result.has(row.proposal_id)) {
      result.set(row.proposal_id, new Map());
    }
    result.get(row.proposal_id)!.set(row.member_id, row.score);
  }

  return result;
}

export async function listProposals(): Promise<PropalListResponse> {
  const db = getDb();
  const [members, memberLabels] = await Promise.all([listMembers(), getMemberMap()]);

  const rows = db
    .prepare(
      `SELECT
        p.id,
        p.title,
        p.artist,
        p.proposed_by,
        p.created_at,
        p.artwork_url,
        p.spotify_url,
        p.deezer_url,
        p.youtube_url,
        COALESCE(AVG(r.score), 0) AS average_rating,
        COUNT(r.score) AS rating_count
      FROM proposals p
      LEFT JOIN ratings r ON r.proposal_id = p.id
      GROUP BY p.id
      ORDER BY average_rating DESC, rating_count DESC, p.created_at DESC`,
    )
    .all() as ProposalRow[];

  const ratingsByProposal = loadRatingsByProposal(
    db,
    rows.map((row) => row.id),
  );

  const proposals = rows.map((row) => {
    const proposal = rowToProposal(row);
    const ratings = ratingsByProposal.get(row.id) ?? new Map();
    return toView(proposal, ratings, memberLabels);
  });

  return { proposals: sortProposals(proposals), members };
}

export async function createProposal(input: {
  title: string;
  artist: string;
  proposedBy: string;
  artworkUrl?: string;
}): Promise<PropalProposalView> {
  const db = getDb();
  const memberLabels = await getMemberMap();
  const musicLinks = await resolveMusicLinks(input.title.trim(), input.artist.trim());
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  db.prepare(
    `INSERT INTO proposals (
      id, title, artist, proposed_by, created_at,
      artwork_url, spotify_url, deezer_url, youtube_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    input.artist.trim(),
    input.proposedBy,
    createdAt,
    input.artworkUrl ?? null,
    musicLinks.spotifyUrl,
    musicLinks.deezerUrl,
    musicLinks.youtubeUrl,
  );

  const proposal: PropalProposal = {
    id,
    title: input.title.trim(),
    artist: input.artist.trim(),
    proposedBy: input.proposedBy,
    createdAt,
    ...(input.artworkUrl ? { artworkUrl: input.artworkUrl } : {}),
    spotifyUrl: musicLinks.spotifyUrl,
    deezerUrl: musicLinks.deezerUrl,
    youtubeUrl: musicLinks.youtubeUrl,
  };

  return toView(proposal, new Map(), memberLabels);
}

export async function rateProposal(input: {
  proposalId: string;
  memberId: string;
  rating: number;
}): Promise<PropalListResponse> {
  const db = getDb();
  const exists = db.prepare("SELECT 1 AS ok FROM proposals WHERE id = ?").get(input.proposalId);
  if (!exists) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  db.prepare(
    `INSERT INTO ratings (proposal_id, member_id, score)
     VALUES (?, ?, ?)
     ON CONFLICT (proposal_id, member_id) DO UPDATE SET score = excluded.score`,
  ).run(input.proposalId, input.memberId, input.rating);

  return listProposals();
}

export async function removeRating(input: {
  proposalId: string;
  memberId: string;
}): Promise<PropalListResponse> {
  const db = getDb();
  const exists = db.prepare("SELECT 1 AS ok FROM proposals WHERE id = ?").get(input.proposalId);
  if (!exists) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  db.prepare("DELETE FROM ratings WHERE proposal_id = ? AND member_id = ?").run(
    input.proposalId,
    input.memberId,
  );

  return listProposals();
}

export async function deleteProposal(input: {
  proposalId: string;
  memberId: string;
}): Promise<PropalListResponse> {
  const db = getDb();
  const row = db
    .prepare("SELECT proposed_by FROM proposals WHERE id = ?")
    .get(input.proposalId) as { proposed_by: string } | undefined;

  if (!row) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  if (row.proposed_by !== input.memberId) {
    throw new Error("FORBIDDEN");
  }

  db.prepare("DELETE FROM proposals WHERE id = ?").run(input.proposalId);

  return listProposals();
}
