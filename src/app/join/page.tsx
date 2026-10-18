import type { Metadata } from "next";
import { EntryPage } from "@/components/entry-page";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/room-code";

export const metadata: Metadata = {
  title: "Join a party",
  description: "Join a MyKaraoke room with a code or invite link.",
};

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  const joinCode = code && isValidRoomCode(code) ? normalizeRoomCode(code) : undefined;
  return <EntryPage joinCode={joinCode} />;
}
