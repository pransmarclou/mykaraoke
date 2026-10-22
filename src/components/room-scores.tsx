"use client";

import { useEffect, useState } from "react";
import { Star, Trophy } from "lucide-react";
import type { ScoreSnapshot } from "@/lib/scores/state";

async function responseError(response: Response): Promise<string> {
  try { return ((await response.json()) as { error?: string }).error ?? "Please try again."; }
  catch { return "Please try again."; }
}

function stars(average: number) {
  return `${average.toFixed(1)} ★`;
}

export function RoomScores({ code, variant = "panel" }: { code: string; variant?: "panel" | "tv" }) {
  const [state, setState] = useState<ScoreSnapshot | null>(null);
  const [connection, setConnection] = useState<"loading" | "connected" | "reconnecting" | "ended">("loading");
  const [saving, setSaving] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    let terminal = false;
    async function refresh() {
      if (terminal) return;
      try {
        const response = await fetch(`/api/rooms/${code}/scores`, { cache: "no-store" });
        if ([403, 404, 410].includes(response.status)) { if (active) { terminal = true; setState(null); setConnection("ended"); } return; }
        if (!response.ok) throw new Error("Scores unavailable");
        const snapshot = await response.json() as ScoreSnapshot;
        if (active && !terminal) { setState(snapshot); setConnection("connected"); }
      } catch { if (active && !terminal) setConnection("reconnecting"); }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 4_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [code]);

  async function rate(value: number) {
    if (!state?.target || saving !== null || connection !== "connected") return;
    setSaving(value);
    setMessage("");
    try {
      const response = await fetch(`/api/rooms/${code}/scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: state.target.itemId, stars: value }),
      });
      if (!response.ok) { setMessage(await responseError(response)); return; }
      setState(await response.json() as ScoreSnapshot);
      setMessage(`You rated ${state.target.performer} ${value} out of 5.`);
    } catch {
      setMessage("Could not save your rating. Check your connection and try again.");
    } finally {
      setSaving(null);
    }
  }

  const visibleLeaderboard = variant === "tv" ? state?.leaderboard.slice(0, 3) : state?.leaderboard;
  const leaderboard = <ol className="mt-3 space-y-2" data-testid="leaderboard">
    {visibleLeaderboard?.map((entry, index) => <li key={entry.performer} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="w-6 font-mono text-sm font-black text-[#ffc16f]">{index + 1}.</span>
      <span className="min-w-0 flex-1 truncate font-semibold text-white">{entry.performer}</span>
      <span className="text-sm font-bold text-[#ffe4cd]">{stars(entry.average)}</span>
      {variant === "panel" ? <span className="text-xs text-muted-foreground">{entry.ratings} {entry.ratings === 1 ? "rating" : "ratings"} · {entry.songs} {entry.songs === 1 ? "song" : "songs"}</span> : null}
    </li>)}
  </ol>;

  if (variant === "tv") {
    return <section aria-labelledby="tv-leaderboard-title">
      <h2 id="tv-leaderboard-title" className="flex items-center gap-2 text-sm font-black text-white"><Trophy className="size-4 text-[#ffc16f]" aria-hidden="true" />Leaderboard</h2>
      {connection === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">Scores are no longer available for this room.</p> : null}
      {connection === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Scores connection interrupted. Reconnecting…</p> : null}
      {!state && connection === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading scores…</p> : null}
      {state && state.leaderboard.length > 0 ? leaderboard : null}
      {state && state.leaderboard.length === 0 ? <div className="grid min-h-52 place-items-center text-center"><div><Trophy className="mx-auto size-10 text-white/20" aria-hidden="true" /><p className="mt-4 text-sm font-semibold text-muted-foreground">No scores yet.</p><p className="mt-1 text-xs text-muted-foreground">Start singing to get on the board!</p></div></div> : null}
    </section>;
  }

  return <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="scores-title">
    <div className="flex items-start gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><Trophy className="size-5" aria-hidden="true" /></span><div><h2 id="scores-title" className="text-xl font-black tracking-tight">Scores</h2><p className="text-sm text-muted-foreground">Rate each performance. Reactions don&apos;t change scores.</p></div></div>
    {connection === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired.</p> : null}
    {connection === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Scores connection interrupted. Reconnecting…</p> : null}
    {!state && connection === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading scores…</p> : null}
    {state && connection !== "ended" ? <>
      {state.target ? <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4" data-testid="rating-target">
        <p className="text-xs font-bold uppercase tracking-wider text-[#ffc16f]">{state.target.live ? "Rate this performance" : "Rate the last performance"}</p>
        <p className="mt-2 font-bold text-white">{state.target.performer}</p>
        <p className="mt-1 text-sm text-muted-foreground">{state.target.title}</p>
        <p className="mt-2 text-sm text-[#ffe4cd]">{state.target.ratings ? `${stars(state.target.average)} from ${state.target.ratings} ${state.target.ratings === 1 ? "rating" : "ratings"}` : "No ratings yet"}</p>
        {state.canRate ? <div className="mt-3 flex flex-wrap gap-1" role="group" aria-label="Your rating">
          {[1, 2, 3, 4, 5].map((value) => {
            const filled = (state.target?.myRating ?? 0) >= value;
            return <button key={value} type="button" aria-label={`Rate ${value} ${value === 1 ? "star" : "stars"}`} aria-pressed={state.target?.myRating === value} disabled={saving !== null || connection !== "connected"} onClick={() => void rate(value)} className="grid size-11 place-items-center rounded-xl border border-white/15 bg-white/5 transition hover:bg-white/10 disabled:opacity-50">
              <Star className={`size-5 ${filled ? "fill-[#ffc16f] text-[#ffc16f]" : "text-muted-foreground"}`} aria-hidden="true" />
            </button>;
          })}
        </div> : <p className="mt-3 text-xs text-muted-foreground">The host has turned guest ratings off.</p>}
      </div> : <p className="mt-5 text-sm text-muted-foreground">Ratings open when the first song starts.</p>}
      <h3 className="mt-6 flex items-center gap-2 text-sm font-bold text-white">Leaderboard</h3>
      {state.leaderboard.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">No rated performances yet.</p> : leaderboard}
    </> : null}
    {message ? <p role="status" className="mt-4 text-sm text-[#ffc16f]">{message}</p> : null}
  </section>;
}
