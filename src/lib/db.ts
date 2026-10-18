import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { myKaraokePool?: Pool };

export function getDb(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  if (!globalForDb.myKaraokePool) {
    globalForDb.myKaraokePool = new Pool({
      connectionString,
      max: 5,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.myKaraokePool;
}
