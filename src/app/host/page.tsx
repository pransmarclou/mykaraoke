import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import QRCode from "qrcode";
import { ArrowLeft, Clock3, LockKeyhole, QrCode } from "lucide-react";
import { HostCreateForm } from "@/components/host-create-form";
import { HostRoomActions } from "@/components/host-room-actions";
import { HostRoomConsole } from "@/components/host-room-console";
import { RoomParticipants } from "@/components/room-participants";
import { RoomSongQueue } from "@/components/room-song-queue";
import { PlaybackDashboard } from "@/components/playback-dashboard";
import { RoomScores } from "@/components/room-scores";
import { MicrophoneStudio } from "@/components/microphone-studio";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { hasDatabaseConfiguration } from "@/lib/db";
import { configuredAppOrigin, HOST_COOKIE_NAME } from "@/lib/rooms/http";
import { buildJoinUrl } from "@/lib/rooms/room-code";
import { getActiveHostRoom, type HostRoom } from "@/lib/rooms/repository";

export const metadata: Metadata = {
  title: "Host a party",
  description: "Create a temporary MyKaraoke room and share its code.",
};

export const dynamic = "force-dynamic";

async function ActiveRoom({ room }: { room: HostRoom }) {
  const joinUrl = buildJoinUrl(configuredAppOrigin(), room.code);
  const localInvite = ["localhost", "127.0.0.1"].includes(new URL(joinUrl).hostname);
  const qrDataUrl = await QRCode.toDataURL(joinUrl, {
    width: 256,
    margin: 2,
    color: { dark: "#0b0d16", light: "#fff2e5" },
  });

  return (
    <div className="w-full">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Host control room</p>
          <h1 className="mt-4 text-[clamp(2.7rem,5vw,5rem)] leading-[0.96] font-black tracking-[-0.065em]">The stage is ready.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#c9bec3]">Keep the party moving from one focused workspace. Guests join with the code or QR while the paired screen handles playback.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#ffc16f]">Room code</p>
          <p data-testid="room-code" className="mt-1 font-mono text-3xl leading-none font-black tracking-[0.14em] text-white">{room.code}</p>
        </div>
      </div>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(22rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <section className="entry-illustration flex min-h-[30rem] flex-col items-center justify-center gap-5 p-7 text-center" aria-labelledby="invite-stage-title">
            <Image src="/brand/mykaraoke-wordmark.png" alt="" width={2172} height={724} className="relative z-10 h-auto w-full max-w-xs object-contain" priority />
            <div className="relative z-10 rounded-2xl bg-[#fff2e5] p-3 shadow-[0_18px_55px_rgba(0,0,0,.3)]">
              <Image src={qrDataUrl} alt={`QR code for room ${room.code} invite link`} width={256} height={256} unoptimized className="size-44 rounded-lg sm:size-52" />
            </div>
            <div className="relative z-10">
              <h2 id="invite-stage-title" className="text-2xl font-black tracking-tight">Bring the singers in</h2>
              <p className="mt-2 flex items-center justify-center gap-2 text-sm font-bold text-[#ffe4cd]"><QrCode className="size-4" aria-hidden="true" />Scan or enter {room.code}</p>
            </div>
          </section>

          <PlaybackDashboard code={room.code} role="host" tvUrl={`${configuredAppOrigin()}/tv/${room.code}`} />
        </div>

        <div className="min-w-0">
          <div className="feature-panel rounded-[1.5rem] p-5 sm:p-6">
            <label htmlFor="invite-link" className="block text-sm font-bold text-white">Invite link</label>
            <input id="invite-link" type="url" readOnly value={joinUrl} className="mt-2 h-12 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white" />
            <HostRoomActions code={room.code} joinUrl={joinUrl} />
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted-foreground"><Clock3 className="mt-1 size-4 shrink-0 text-[#ffb65a]" aria-hidden="true" />This room expires <time dateTime={room.expiresAt.toISOString()}>{room.expiresAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Chicago" })} CT.</time></p>
            {localInvite ? <p className="mt-2 text-sm leading-6 text-muted-foreground">This localhost invite is a same-computer preview; a phone needs a deployed HTTPS address.</p> : null}
          </div>

          <div className="mt-6">
            <HostRoomConsole
              queue={<RoomSongQueue code={room.code} role="host" singer="Host" />}
              scores={<RoomScores code={room.code} />}
              studio={<MicrophoneStudio />}
              people={<RoomParticipants code={room.code} />}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function HostPage() {
  const cookieStore = await cookies();
  let room: HostRoom | null = null;
  let available = hasDatabaseConfiguration();
  const credential = cookieStore.get(HOST_COOKIE_NAME)?.value;
  if (available && credential) {
    try {
      room = await getActiveHostRoom(credential);
    } catch (error) {
      console.error("Host room load failed", { name: error instanceof Error ? error.name : "Unknown", code: (error as { code?: string })?.code });
      available = false;
    }
  }

  return (
    <div className="page-shell flex min-h-screen flex-col">
      <SiteHeader showThemePicker={!room} />
      <main className="content-wrap flex flex-1 items-center py-14 md:py-20">
        {room ? <ActiveRoom room={room} /> : (
          <div className="grid w-full items-center gap-12 md:grid-cols-[1.05fr_0.95fr] md:gap-16">
            <div>
              <Link href="/" className="mb-10 flex w-fit items-center gap-2 rounded-sm text-sm font-semibold text-muted-foreground hover:text-white"><ArrowLeft className="size-4" aria-hidden="true" />Back to home</Link>
              <p className="eyebrow">The host experience</p>
              <h1 className="mt-6 max-w-2xl text-[clamp(3.2rem,6vw,6rem)] leading-[0.98] font-black tracking-[-0.07em]">Set the stage for everyone.</h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#c9bec3]">Create a temporary room, then share its code, link, or QR with your party.</p>
              <HostCreateForm available={available} />
              <p className="mt-7 flex max-w-xl items-start gap-2 text-sm leading-6 text-muted-foreground"><LockKeyhole className="mt-1 size-4 shrink-0 text-[#ffb65a]" aria-hidden="true" />Only this browser receives the private host session. The room code alone never grants host control.</p>
              <Link href="/join" className="mt-7 inline-flex items-center gap-2 rounded-sm text-sm font-bold text-[#ffad69] underline decoration-[#ff8c34]/50 underline-offset-4 hover:text-white">Explore joining</Link>
            </div>
            <div className="entry-illustration grid place-items-center" role="img" aria-label="MyKaraoke microphone logo on a stage">
              <Image src="/brand/microphone-logo.png" alt="" width={1402} height={1122} className="entry-logo" priority />
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
