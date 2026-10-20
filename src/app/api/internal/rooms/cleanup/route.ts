import { NextResponse } from "next/server";
import {
  assertCleanupDatabaseTarget,
  isAuthorizedCleanupRequest,
} from "@/lib/rooms/cleanup-policy";
import { cleanupExpiredRooms } from "@/lib/rooms/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function safeErrorFields(error: unknown): { errorName: string; errorCode?: string } {
  return {
    errorName: error instanceof Error ? error.name : "Unknown",
    ...((error as { code?: string })?.code ? { errorCode: (error as { code: string }).code } : {}),
  };
}

export async function GET(request: Request) {
  const startedAt = Date.now();
  if (!isAuthorizedCleanupRequest(request.headers.get("authorization"))) {
    console.warn(JSON.stringify({ event: "room_cleanup_rejected", outcome: "unauthorized" }));
    return NextResponse.json({ ok: false }, { status: 401, headers: noStoreHeaders });
  }

  try {
    assertCleanupDatabaseTarget();
    const result = await cleanupExpiredRooms();
    console.info(JSON.stringify({
      event: "room_cleanup_completed",
      outcome: "success",
      durationMs: Date.now() - startedAt,
      ...result,
    }));
    return NextResponse.json({ ok: true, ...result }, { headers: noStoreHeaders });
  } catch (error) {
    console.error(JSON.stringify({
      event: "room_cleanup_failed",
      outcome: "error",
      durationMs: Date.now() - startedAt,
      ...safeErrorFields(error),
    }));
    return NextResponse.json(
      { ok: false, error: "Room cleanup failed." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
