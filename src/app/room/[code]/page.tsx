import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { RoomParticipants } from "@/components/room-participants";
import { GuestPhoneRoom } from "@/components/guest-phone-room";
import { MicrophoneStudio } from "@/components/microphone-studio";
import { PlaybackDashboard } from "@/components/playback-dashboard";
import { RoomScores } from "@/components/room-scores";
import { SiteFooter } from "@/components/site-footer";
import { getActiveGuest } from "@/lib/rooms/guests";
import { GUEST_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/room-code";

export const metadata: Metadata = { title: "Party room", description: "See who's in your MyKaraoke room." };
export const dynamic = "force-dynamic";

export default async function GuestRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  if (!isValidRoomCode(rawCode)) redirect("/join");
  const code = normalizeRoomCode(rawCode);
  const cookieStore = await cookies();
  const guest = await getActiveGuest(code, cookieStore.get(GUEST_COOKIE_NAME)?.value);
  if (!guest) redirect(`/join?code=${code}`);
  const role = guest.isHost ? "host" : "guest";

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <main className="flex-1 px-4">
        <GuestPhoneRoom
          code={code}
          guestId={guest.id}
          guestLabel={guest.label}
          role={role}
          stage={<PlaybackDashboard code={code} role={role} guestId={guest.id} showTvSetup={guest.isHost} />}
          scores={<RoomScores code={code} />}
          people={<RoomParticipants code={code} guest currentMemberId={guest.id} canTransferHost={guest.isHost} />}
          studio={guest.isHost ? <MicrophoneStudio /> : null}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
