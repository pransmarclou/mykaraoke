import { getDb } from "../src/lib/db";
import { assertCleanupDatabaseTarget } from "../src/lib/rooms/cleanup-policy";
import { cleanupExpiredRooms } from "../src/lib/rooms/repository";

async function main() {
  try {
    assertCleanupDatabaseTarget();
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
