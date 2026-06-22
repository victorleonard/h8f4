import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";

const dbPath = process.env.PROPAL_DB_PATH ?? "./data/propal.db";
const membersFile = process.argv[2] ?? "data/propal-members.example.json";
const schemaPath = join(fileURLToPath(new URL("./propal-schema.sql", import.meta.url)));

mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.exec(readFileSync(schemaPath, "utf8"));

const members = JSON.parse(readFileSync(membersFile, "utf8"));
const insert = db.prepare(
  "INSERT OR IGNORE INTO members (id, label, created_at) VALUES (?, ?, ?)",
);

let added = 0;
let skipped = 0;

for (const member of members) {
  const createdAt = member.createdAt ?? new Date().toISOString();
  const result = insert.run(member.id, member.label, createdAt);
  if (result.changes > 0) {
    console.log(`Ajouté : ${member.label} (${member.id})`);
    added += 1;
  } else {
    console.log(`Ignoré (déjà présent) : ${member.label} (${member.id})`);
    skipped += 1;
  }
}

console.log(`\nTerminé : ${added} ajouté(s), ${skipped} ignoré(s). Base : ${dbPath}`);
