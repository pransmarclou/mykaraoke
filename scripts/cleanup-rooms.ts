import { getDb } from "../src/lib/db";
import { cleanupExpiredRooms } from "../src/lib/rooms/repository";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("Room cleanup requires DATABASE_URL.");
    process.exitCode = 1;
    return;
  }
  let hostname: string | undefined;
  try { hostname = new URL(connectionString).hostname; }
  catch { console.error("Room cleanup requires a valid DATABASE_URL."); process.exitCode = 1; }
  if (!hostname) return;
  const isLocal = ["127.0.0.1", "localhost"].includes(hostname);
  if (!isLocal && process.env.MYKARAOKE_CLEANUP_DB_HOST !== hostname) {
    console.error("Room cleanup refused a hosted database without MYKARAOKE_CLEANUP_DB_HOST set to its exact hostname.");
    process.exitCode = 1;
    return;
  }
  try {
    const result = await cleanupExpiredRooms();
    console.log(JSON.stringify({ event: "room_cleanup", ...result }));
  } catch (error) {
    console.error("Room cleanup failed", { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
    process.exitCode = 1;
  } finally {
    await getDb().end();
  }
}

void main();
