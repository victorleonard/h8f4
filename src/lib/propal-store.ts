import { getMemberMap, listMembers } from "./propal-members-store";
import { resolveMusicLinks } from "./music-links";
import type { PropalListResponse, PropalProposal, PropalProposalView, PropalRating } from "./propal-types";
import { getRedis } from "./redis";

const PROPOSALS_KEY = "propal:proposals";
const proposalKey = (id: string) => `propal:item:${id}`;
const ratingsKey = (id: string) => `propal:ratings:${id}`;

function parseRatings(raw: Record<string, string> | null | undefined): Map<string, number> {
  const ratings = new Map<string, number>();

  for (const [memberId, value] of Object.entries(raw ?? {})) {
    const score = Number(value);
    if (score >= 1 && score <= 5) {
      ratings.set(memberId, score);
    }
  }

  return ratings;
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

async function syncProposalScore(redis: NonNullable<ReturnType<typeof getRedis>>, proposalId: string): Promise<number> {
  const raw = await redis.hgetall<Record<string, string>>(ratingsKey(proposalId));
  const ratings = parseRatings(raw);
  const averageRating = ratings.size
    ? [...ratings.values()].reduce((sum, score) => sum + score, 0) / ratings.size
    : 0;

  await redis.zadd(PROPOSALS_KEY, { score: averageRating, member: proposalId });
  return averageRating;
}

export async function listProposals(): Promise<PropalListResponse> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const [members, memberLabels] = await Promise.all([listMembers(), getMemberMap()]);
  const ids = await redis.zrange<string[]>(PROPOSALS_KEY, 0, -1, { rev: true });
  const proposals: PropalProposalView[] = [];

  for (const id of ids ?? []) {
    const raw = await redis.get<string>(proposalKey(id));
    if (!raw) continue;

    const proposal = typeof raw === "string" ? (JSON.parse(raw) as PropalProposal) : (raw as PropalProposal);
    const ratingsRaw = await redis.hgetall<Record<string, string>>(ratingsKey(id));
    const ratings = parseRatings(ratingsRaw);

    proposals.push(toView(proposal, ratings, memberLabels));
  }

  return { proposals: sortProposals(proposals), members };
}

export async function createProposal(input: {
  title: string;
  artist: string;
  proposedBy: string;
  artworkUrl?: string;
}): Promise<PropalProposalView> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const memberLabels = await getMemberMap();
  const musicLinks = await resolveMusicLinks(input.title.trim(), input.artist.trim());
  const id = crypto.randomUUID();
  const proposal: PropalProposal = {
    id,
    title: input.title.trim(),
    artist: input.artist.trim(),
    proposedBy: input.proposedBy,
    createdAt: new Date().toISOString(),
    ...(input.artworkUrl ? { artworkUrl: input.artworkUrl } : {}),
    spotifyUrl: musicLinks.spotifyUrl,
    deezerUrl: musicLinks.deezerUrl,
    youtubeUrl: musicLinks.youtubeUrl,
  };

  await redis.set(proposalKey(id), JSON.stringify(proposal));
  await redis.zadd(PROPOSALS_KEY, { score: 0, member: id });

  return toView(proposal, new Map(), memberLabels);
}

export async function rateProposal(input: {
  proposalId: string;
  memberId: string;
  rating: number;
}): Promise<PropalListResponse> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const exists = await redis.exists(proposalKey(input.proposalId));
  if (!exists) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  await redis.hset(ratingsKey(input.proposalId), { [input.memberId]: String(input.rating) });
  await syncProposalScore(redis, input.proposalId);

  return listProposals();
}

export async function removeRating(input: {
  proposalId: string;
  memberId: string;
}): Promise<PropalListResponse> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const exists = await redis.exists(proposalKey(input.proposalId));
  if (!exists) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  await redis.hdel(ratingsKey(input.proposalId), input.memberId);
  await syncProposalScore(redis, input.proposalId);

  return listProposals();
}

function parseProposal(raw: unknown): PropalProposal | null {
  if (!raw) return null;
  const data = typeof raw === "string" ? (JSON.parse(raw) as PropalProposal) : (raw as PropalProposal);
  if (!data.id || !data.proposedBy) return null;
  return data;
}

export async function deleteProposal(input: {
  proposalId: string;
  memberId: string;
}): Promise<PropalListResponse> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const raw = await redis.get<string>(proposalKey(input.proposalId));
  const proposal = parseProposal(raw);
  if (!proposal) {
    throw new Error("PROPOSAL_NOT_FOUND");
  }

  if (proposal.proposedBy !== input.memberId) {
    throw new Error("FORBIDDEN");
  }

  await redis.del(ratingsKey(input.proposalId));
  await redis.del(proposalKey(input.proposalId));
  await redis.zrem(PROPOSALS_KEY, input.proposalId);

  return listProposals();
}
