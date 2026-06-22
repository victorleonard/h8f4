import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { PROPAL_DB_SCHEMA } from "./propal-schema";

let db: Database.Database | null = null;

export function getDbPath(): string {
  return process.env.PROPAL_DB_PATH ?? "./data/propal.db";
}

function initSchema(database: Database.Database): void {
  database.exec(PROPAL_DB_SCHEMA);
}

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });

  db = new Database(dbPath);
  initSchema(db);

  return db;
}
