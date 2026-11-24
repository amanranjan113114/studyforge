import { Pool } from "pg";

/**
 * Postgres connection (works with Neon, Supabase, Railway, or a local Postgres).
 * Set DATABASE_URL in .env.local. Tables are created automatically on first use.
 */

const SCHEMA = `
SELECT pg_advisory_xact_lock(727274);

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  level          TEXT NOT NULL DEFAULT '',
  goal           TEXT NOT NULL DEFAULT '',
  exam_date      TEXT,
  hours_per_day  DOUBLE PRECISION NOT NULL DEFAULT 2,
  syllabus_text  TEXT NOT NULL,
  structure_json TEXT NOT NULL,
  plan_json      TEXT NOT NULL,
  created_at     BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subjects_user ON subjects(user_id);

CREATE TABLE IF NOT EXISTS progress (
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id   TEXT NOT NULL,
  PRIMARY KEY (subject_id, topic_id)
);

CREATE TABLE IF NOT EXISTS practice (
  subject_id   TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic_id     TEXT NOT NULL,
  content_json TEXT NOT NULL,
  created_at   BIGINT NOT NULL,
  PRIMARY KEY (subject_id, topic_id)
);
`;

// Keep one pool per server instance, even across dev hot reloads
const g = globalThis as unknown as { __sfPool?: Pool; __sfReady?: Promise<unknown> };

function getPool(): Pool {
  if (!g.__sfPool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL is not set. Add your Postgres (Neon) connection string to .env.local");
    }
    // Small pool: serverless platforms open many short-lived instances
    g.__sfPool = new Pool({ connectionString: url, max: 3 });
  }
  return g.__sfPool;
}

function ready(): Promise<unknown> {
  const existing = g.__sfReady;
  if (existing) return existing;

  const started: Promise<unknown> = getPool()
    .query(SCHEMA)
    .catch((e: unknown) => {
      g.__sfReady = undefined; // allow a retry on the next request
      throw e;
    });
  g.__sfReady = started;
  return started;
}

export async function query<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  await ready();
  const res = await getPool().query(text, params);
  return res.rows as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
