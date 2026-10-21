import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GuestRoomActions } from "@/components/guest-room-actions";
import { GuestRoomConsole } from "@/components/guest-room-console";
import { RoomParticipants } from "@/components/room-participants";
import { RoomSongQueue } from "@/components/room-song-queue";
import { PlaybackDashboard } from "@/components/playback-dashboard";
import { RoomScores } from "@/components/room-scores";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
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

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader showThemePicker={false} />
      <main className="content-wrap flex-1 py-8 md:py-14">
        <Link href="/" className="flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-white">
          <ArrowLeft className="size-4" aria-hidden="true" />Home
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">Room {code}</p>
            <h1 className="mt-4 text-[clamp(2.5rem,7vw,4.5rem)] leading-none font-black tracking-[-0.065em]">
              Welcome, <span className="text-gradient">{guest.label}.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#c9bec3]">Search for your next song, follow the stage, react, rate performances, and see who&apos;s here.</p>
          </div>
          <GuestRoomActions code={code} compact />
        </div>

        <div className="mt-8">
          <GuestRoomConsole
            songs={<RoomSongQueue code={code} role="guest" singer={guest.label} />}
            stage={<PlaybackDashboard code={code} role="guest" />}
            scores={<RoomScores code={code} />}
            people={<RoomParticipants code={code} guest />}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
