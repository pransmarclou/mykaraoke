import { NextResponse } from "next/server";
import { ReactionError } from "@/lib/reactions/state";
import { songApiError } from "@/lib/songs/api";

export function reactionApiError(error: unknown, context: string): NextResponse {
  if (error instanceof ReactionError) {
    const responses = {
      invalid: [400, "Choose one of the available reactions."],
      ended: [410, "This room has ended or expired."],
      empty: [409, "Wait until a singer is on stage before reacting."],
      limited: [429, "You are cheering a little too quickly. Wait a moment and try again."],
      forbidden: [403, "The host has turned reactions off."],
    } as const;
    const [status, message] = responses[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return songApiError(error, context);
}
