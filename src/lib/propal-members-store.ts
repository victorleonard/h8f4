import type { PropalMember } from "./propal-types";
import { getRedis } from "./redis";

const MEMBERS_KEY = "propal:members";
const memberKey = (id: string) => `propal:member:${id}`;

function parseMember(raw: unknown): PropalMember | null {
  if (!raw) return null;

  const data = typeof raw === "string" ? (JSON.parse(raw) as PropalMember) : (raw as PropalMember);
  if (!data.id || !data.label) return null;

  return data;
}

export async function listMembers(): Promise<PropalMember[]> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("REDIS_NOT_CONFIGURED");
  }

  const ids = (await redis.smembers<string[]>(MEMBERS_KEY)) ?? [];
  const members: PropalMember[] = [];

  for (const id of ids) {
    const raw = await redis.get(memberKey(id));
    const member = parseMember(raw);
    if (member) members.push(member);
  }

  return members.sort((a, b) => a.label.localeCompare(b.label, "fr"));
}

export async function getMemberMap(): Promise<Map<string, string>> {
  const members = await listMembers();
  return new Map(members.map((member) => [member.id, member.label]));
}

export async function memberExists(id: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  return (await redis.sismember(MEMBERS_KEY, id)) === 1;
}
