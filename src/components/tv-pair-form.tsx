"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTvRemoteNavigation } from "@/lib/tv/use-tv-remote-navigation";

export function TvPairForm({ code }: { code: string }) {
  const router = useRouter();
  const [pairCode, setPairCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useTvRemoteNavigation();
  async function pair(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/rooms/${code}/playback/pair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pairCode }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Pairing failed.");
      try { window.sessionStorage.setItem(`mykaraoke:tv-autoplay:${code}`, "1"); } catch { /* Playback keeps its visible manual fallback. */ }
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pairing failed."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void pair(event)} className="tv-pair-form mx-auto mt-12 max-w-md rounded-3xl border border-white/15 bg-white/5 p-7">
    <label htmlFor="tv-pair-code" className="block text-sm font-bold">TV pairing code</label>
    <input id="tv-pair-code" value={pairCode} onChange={(event) => setPairCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/gu, "").slice(0, 8))} autoComplete="off" maxLength={8} data-tv-focus className="mt-3 h-14 w-full rounded-xl border border-white/20 bg-[#191923] px-4 text-center font-mono text-2xl tracking-[0.2em] text-white outline-none focus-visible:border-[#ffad69] focus-visible:ring-4 focus-visible:ring-[#ffad69]/40" placeholder="8 characters" />
    <button type="submit" disabled={busy || pairCode.length !== 8} data-tv-focus className="mt-5 min-h-14 w-full rounded-xl bg-[#d92362] px-5 py-3 font-bold text-white outline-none focus-visible:ring-4 focus-visible:ring-[#ffc16f] disabled:opacity-50">{busy ? "Pairing…" : "Pair this display"}</button>
    <p className="mt-4 text-xs text-muted-foreground">TV remote: use the arrow keys to move and Enter to select.</p>
    {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
  </form>;
}
