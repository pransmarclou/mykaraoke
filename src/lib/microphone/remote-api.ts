import { NextResponse } from "next/server";
import { RemoteMicError } from "@/lib/microphone/remote-state";
import { songApiError } from "@/lib/songs/api";

export function remoteMicApiError(error: unknown, context: string): NextResponse {
  if (error instanceof RemoteMicError) {
    const responses = {
      invalid: [400, "This microphone signal is invalid."],
      forbidden: [403, "Only the guest who added the current song can use its phone microphone."],
      ended: [410, "This room has ended or expired."],
      stale: [409, "The song changed. Enable the microphone again for the current singer."],
      limited: [429, "Too many microphone connection messages. Wait a moment and try again."],
      unconfigured: [503, "Remote microphone signaling is not configured."],
    } as const;
    const [status, message] = responses[error.reason];
    return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
  }
  return songApiError(error, context);
}
