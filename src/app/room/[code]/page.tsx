import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { GuestRoomActions } from "@/components/guest-room-actions";
import { RoomParticipants } from "@/components/room-participants";
import { RoomSongQueue } from "@/components/room-song-queue";
import { PlaybackDashboard } from "@/components/playback-dashboard";
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

  return <div className="page-shell flex min-h-screen flex-col"><SiteHeader /><main className="content-wrap grid flex-1 items-start gap-8 py-12 md:grid-cols-[1fr_0.8fr] md:gap-12 md:py-20"><div><Link href="/" className="mb-9 flex w-fit items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-white"><ArrowLeft className="size-4" aria-hidden="true" />Home</Link><p className="eyebrow">You&apos;re in room {code}</p><h1 className="mt-5 text-[clamp(3rem,6vw,5rem)] leading-none font-black tracking-[-0.07em]">Welcome, <span className="text-gradient">{guest.label}.</span></h1><p className="mt-6 max-w-xl text-lg leading-8 text-[#c9bec3]">You&apos;re part of the party. Keep this page open to show that you&apos;re here; a brief disconnect will reconnect automatically.</p><GuestRoomActions code={code} /><div className="mt-9"><PlaybackDashboard code={code} role="guest" /></div><div className="mt-9"><RoomSongQueue code={code} role="guest" singer={guest.label} /></div></div><RoomParticipants code={code} guest /></main><SiteFooter /></div>;
}
