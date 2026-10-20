import { timingSafeEqual } from "node:crypto";
import { databaseConfiguration } from "@/lib/db";

type CleanupEnvironment = Readonly<Record<string, string | undefined>>;

export class CleanupConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CleanupConfigurationError";
  }
}

function equalSecrets(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function isAuthorizedCleanupRequest(
  authorization: string | null,
  env: CleanupEnvironment = process.env,
): boolean {
  const secret = env.CRON_SECRET;
  if (!secret || secret.length < 32 || !authorization) return false;
  return equalSecrets(authorization, `Bearer ${secret}`);
}

export function assertCleanupDatabaseTarget(env: CleanupEnvironment = process.env): string {
  let hostname: string;
  try {
    hostname = new URL(databaseConfiguration(env).connectionString).hostname;
  } catch {
    throw new CleanupConfigurationError("Room cleanup requires a valid database URL.");
  }

  if (["127.0.0.1", "localhost"].includes(hostname)) return hostname;
  if (env.MYKARAOKE_CLEANUP_DB_HOST !== hostname) {
    throw new CleanupConfigurationError(
      "Room cleanup refused a hosted database without an exact MYKARAOKE_CLEANUP_DB_HOST match.",
    );
  }
  return hostname;
}
