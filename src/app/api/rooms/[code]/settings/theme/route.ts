import { NextResponse } from "next/server";
import { hasSameOrigin } from "@/lib/rooms/http";
import { songApiError, songRoomAccess } from "@/lib/songs/api";
import { PartyThemeError, updateRoomPartyTheme } from "@/lib/themes/state";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    if (!hasSameOrigin(request)) {
      return NextResponse.json(
        { error: "This request must come from MyKaraoke." },
        { status: 403 },
      );
    }
    if (Number(request.headers.get("content-length") ?? 0) > 512) {
      return NextResponse.json(
        { error: "Theme request is too large." },
        { status: 413 },
      );
    }
    const { code } = await params;
    const access = await songRoomAccess(code);
    if (access.role !== "host") {
      return NextResponse.json(
        { error: "Only the host can change the party theme." },
        { status: 403 },
      );
    }
    const body = (await request.json().catch(() => null)) as {
      themeId?: unknown;
    } | null;
    return NextResponse.json(
      await updateRoomPartyTheme(access.roomId, body?.themeId),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof PartyThemeError) {
      return error.reason === "ended"
        ? NextResponse.json(
            { error: "This room has ended or expired." },
            { status: 410, headers: { "Cache-Control": "no-store" } },
          )
        : NextResponse.json(
            { error: "Choose a supported party theme." },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
    }
    return songApiError(error, "Party theme update failed");
  }
}
