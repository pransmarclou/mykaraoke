import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { TvPairForm } from "@/components/tv-pair-form";
import { TvStage } from "@/components/tv-stage";
import { TV_COOKIE_NAME } from "@/lib/rooms/http";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/rooms/room-code";
import { tvRoomAccess } from "@/lib/playback/state";

export const metadata: Metadata = { title: "TV playback", description: "A paired MyKaraoke playback display." };
export const dynamic = "force-dynamic";

export default async function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  if (!isValidRoomCode(rawCode)) notFound();
  const code = normalizeRoomCode(rawCode);
  const credential = (await cookies()).get(TV_COOKIE_NAME)?.value;
  const paired = await tvRoomAccess(code, credential);
  return <div className="min-h-screen bg-[#0b0d16] text-white">{paired ? <TvStage code={code} /> : <main className="mx-auto min-h-screen max-w-2xl px-5 py-16 text-center"><p className="eyebrow">MyKaraoke TV</p><h1 className="mt-5 text-4xl font-black tracking-tight">Pair this display</h1><p className="mt-4 text-muted-foreground">Ask the host of room <span className="font-mono text-white">{code}</span> to generate a TV pairing code. Enter it here to make this the party&apos;s playback display.</p><TvPairForm code={code} /><p className="mt-8 text-sm text-muted-foreground">A room code alone cannot control or view playback on this screen.</p></main>}</div>;
}
