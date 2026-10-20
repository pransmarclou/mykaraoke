import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { parseGuestPermissionPatch } from "@/lib/permissions/rules";
import { PermissionError, updateGuestPermissions } from "@/lib/permissions/state";
import { songApiError, songRoomAccess } from "@/lib/songs/api";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!hasSameOrigin(request)) return NextResponse.json({ error: "This request must come from MyKaraoke." }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ error: "Permission request is too large." }, { status: 413 });
    const { code } = await params;
    const access = await songRoomAccess(code);
    if (access.role !== "host") return NextResponse.json({ error: "Only the host can change guest permissions." }, { status: 403 });
    const patch = parseGuestPermissionPatch(await request.json().catch(() => null));
    if (!patch) return NextResponse.json({ error: "Invalid guest permission setting." }, { status: 400 });
    return NextResponse.json(
      { guestPermissions: await updateGuestPermissions(access.roomId, patch) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PermissionError) {
      return error.reason === "ended"
        ? NextResponse.json({ error: "This room has ended or expired." }, { status: 410, headers: { "Cache-Control": "no-store" } })
        : NextResponse.json({ error: "Invalid guest permission setting." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return songApiError(error, "Guest permission update failed");
  }
}
