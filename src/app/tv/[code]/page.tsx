import type { Metadata } from "next";
import Image from "next/image";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { LockKeyhole } from "lucide-react";
import { TvPairForm } from "@/components/tv-pair-form";
import { TvStage } from "@/components/tv-stage";
import { configuredAppOrigin, TV_COOKIE_NAME } from "@/lib/rooms/http";
import { buildJoinUrl, isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/room-code";
import { tvRoomAccess } from "@/lib/playback/state";

export const metadata: Metadata = { title: "TV playback", description: "A paired MyKaraoke playback display." };
export const dynamic = "force-dynamic";

export default async function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  if (!isValidRoomCode(rawCode)) notFound();
  const code = normalizeRoomCode(rawCode);
  const credential = (await cookies()).get(TV_COOKIE_NAME)?.value;
  const paired = await tvRoomAccess(code, credential);
  const qrDataUrl = paired ? await QRCode.toDataURL(buildJoinUrl(configuredAppOrigin(), code), {
    width: 320,
    margin: 2,
    color: { dark: "#0b0d16", light: "#fff2e5" },
  }) : "";

  return (
    <div className="page-shell min-h-screen text-white">
      {paired ? <TvStage code={code} qrDataUrl={qrDataUrl} /> : (
        <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-8 sm:px-10 sm:py-12">
          <header className="flex items-center justify-between border-b border-white/10 pb-6">
            <Image src="/brand/mykaraoke-wordmark.png" alt="MyKaraoke" width={2172} height={724} className="h-auto w-48 rounded-xl bg-[#fff2e5] p-2 object-contain sm:w-60" priority />
            <p className="rounded-full border border-white/10 bg-white/5 px-4 py-2 font-mono text-sm font-bold tracking-[0.16em] text-[#ffc16f]">ROOM {code}</p>
          </header>
          <div className="grid flex-1 place-items-center py-10">
            <section className="feature-panel w-full max-w-2xl rounded-[2rem] p-7 text-center sm:p-12" aria-labelledby="pair-display-title">
              <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary/15 text-[#ffad69]"><LockKeyhole className="size-8" aria-hidden="true" /></span>
              <p className="eyebrow mt-7">Secure display setup</p>
              <h1 id="pair-display-title" className="mt-4 text-[clamp(2.5rem,6vw,4.75rem)] leading-none font-black tracking-[-0.06em]">Pair this display</h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted-foreground">Ask the host to generate a temporary TV pairing code, then enter it below. The public room code never grants playback authority.</p>
              <TvPairForm code={code} />
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
