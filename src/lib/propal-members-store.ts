import type { PropalMember } from "./propal-types";
import { getDb } from "./db";

interface MemberRow {
  id: string;
  label: string;
  created_at: string;
}

function rowToMember(row: MemberRow): PropalMember {
  return {
    id: row.id,
    label: row.label,
    createdAt: row.created_at,
  };
}

export async function listMembers(): Promise<PropalMember[]> {
  const db = getDb();
  const rows = db
    .prepare("SELECT id, label, created_at FROM members ORDER BY label COLLATE NOCASE ASC")
    .all() as MemberRow[];

  return rows.map(rowToMember);
}

export async function getMemberMap(): Promise<Map<string, string>> {
  const members = await listMembers();
  return new Map(members.map((member) => [member.id, member.label]));
}

export async function memberExists(id: string): Promise<boolean> {
  const db = getDb();
  const row = db.prepare("SELECT 1 AS ok FROM members WHERE id = ?").get(id);
  return Boolean(row);
}

export async function createMember(input: { id: string; label: string }): Promise<PropalMember> {
  const db = getDb();
  const createdAt = new Date().toISOString();

  try {
    db.prepare("INSERT INTO members (id, label, created_at) VALUES (?, ?, ?)").run(
      input.id,
      input.label,
      createdAt,
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      throw new Error("MEMBER_EXISTS");
    }
    throw error;
  }

  return { id: input.id, label: input.label, createdAt };
}

export async function updateMember(input: { id: string; label: string }): Promise<PropalMember> {
  const db = getDb();
  const row = db
    .prepare("SELECT id, label, created_at FROM members WHERE id = ?")
    .get(input.id) as MemberRow | undefined;

  if (!row) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  db.prepare("UPDATE members SET label = ? WHERE id = ?").run(input.label, input.id);

  return { id: row.id, label: input.label, createdAt: row.created_at };
}

export async function deleteMember(id: string): Promise<void> {
  const db = getDb();
  const row = db.prepare("SELECT 1 AS ok FROM members WHERE id = ?").get(id);
  if (!row) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const deleteMemberData = db.transaction((memberId: string) => {
    db.prepare("DELETE FROM ratings WHERE member_id = ?").run(memberId);
    db.prepare(
      "DELETE FROM ratings WHERE proposal_id IN (SELECT id FROM proposals WHERE proposed_by = ?)",
    ).run(memberId);
    db.prepare("DELETE FROM proposals WHERE proposed_by = ?").run(memberId);
    db.prepare("DELETE FROM members WHERE id = ?").run(memberId);
  });

  deleteMemberData(id);
}
