import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { myKaraokePool?: Pool };
type DatabaseEnvironment = Readonly<Record<string, string | undefined>>;

export function databaseConfiguration(env: DatabaseEnvironment = process.env): { connectionString: string; max: number } {
  let connectionString = env.POSTGRES_URL || env.DATABASE_URL;
  if (!connectionString) throw new Error("POSTGRES_URL or DATABASE_URL is not configured");

  if (env.POSTGRES_URL) {
    const pooledUrl = new URL(connectionString);
    if (pooledUrl.searchParams.get("sslmode") === "require" && !pooledUrl.searchParams.has("uselibpqcompat")) {
      // pg 8.23 temporarily interprets sslmode=require as verify-full. Supabase's
      // managed pooler URL intentionally uses libpq's encrypted `require` mode;
      // opt into those semantics explicitly instead of disabling TLS.
      pooledUrl.searchParams.set("uselibpqcompat", "true");
      connectionString = pooledUrl.toString();
    }
  }

  return {
    connectionString,
    // A warm serverless function keeps this module-scoped pool alive. Capping
    // it at one connection prevents horizontally scaled functions from
    // exhausting Supabase's transaction pooler.
    max: env.VERCEL ? 1 : 10,
  };
}

export function hasDatabaseConfiguration(env: DatabaseEnvironment = process.env): boolean {
  return Boolean(env.POSTGRES_URL || env.DATABASE_URL);
}

export function getDb(): Pool {
  const { connectionString, max } = databaseConfiguration();

  if (!globalForDb.myKaraokePool) {
    globalForDb.myKaraokePool = new Pool({
      connectionString,
      max,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
  }
  return globalForDb.myKaraokePool;
}
