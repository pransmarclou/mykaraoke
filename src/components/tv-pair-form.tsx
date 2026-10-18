"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TvPairForm({ code }: { code: string }) {
  const router = useRouter();
  const [pairCode, setPairCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function pair(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/rooms/${code}/playback/pair`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pairCode }) });
      if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "Pairing failed.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pairing failed."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={(event) => void pair(event)} className="mx-auto mt-12 max-w-md rounded-3xl border border-white/15 bg-white/5 p-7">
    <label htmlFor="tv-pair-code" className="block text-sm font-bold">TV pairing code</label>
    <input id="tv-pair-code" value={pairCode} onChange={(event) => setPairCode(event.target.value.toUpperCase().replace(/[^A-Z2-9]/gu, "").slice(0, 8))} autoComplete="off" maxLength={8} className="mt-3 h-14 w-full rounded-xl border border-white/20 bg-[#191923] px-4 text-center font-mono text-2xl tracking-[0.2em] text-white" placeholder="8 characters" />
    <button type="submit" disabled={busy || pairCode.length !== 8} className="mt-5 w-full rounded-xl bg-[#d92362] px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Pairing…" : "Pair this display"}</button>
    {error ? <p role="alert" className="mt-4 text-sm text-[#ffb0a2]">{error}</p> : null}
  </form>;
}
