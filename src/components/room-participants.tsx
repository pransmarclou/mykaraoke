"use client";

import { useEffect, useReducer } from "react";
import { Circle, UsersRound } from "lucide-react";
import { presenceReducer, type Participant } from "@/lib/rooms/presence";

export function RoomParticipants({ code, guest = false }: { code: string; guest?: boolean }) {
  const [{ participants, status }, dispatch] = useReducer(presenceReducer, { participants: [], status: "loading" });

  useEffect(() => {
    let active = true;
    async function update(method: "GET" | "POST") {
      try {
        const response = await fetch(`/api/rooms/${code}/presence`, { method, cache: "no-store" });
        if (!active) return;
        if (response.status === 410 || response.status === 404 || response.status === 403) {
          dispatch({ type: "ended" });
          return;
        }
        if (!response.ok) throw new Error("Presence unavailable");
        const result = (await response.json()) as { participants: Participant[] };
        if (active) {
          dispatch({ type: "snapshot", participants: result.participants });
        }
      } catch {
        if (active) dispatch({ type: "interrupted" });
      }
    }

    void update(guest ? "POST" : "GET");
    const poll = window.setInterval(() => void update("GET"), 5_000);
    const heartbeat = guest ? window.setInterval(() => void update("POST"), 10_000) : undefined;
    const onReconnect = () => void update(guest ? "POST" : "GET");
    window.addEventListener("online", onReconnect);
    return () => {
      active = false;
      window.clearInterval(poll);
      if (heartbeat) window.clearInterval(heartbeat);
      window.removeEventListener("online", onReconnect);
    };
  }, [code, guest]);

  return (
    <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="room-people-title">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary/15 text-[#ffad69]"><UsersRound className="size-5" aria-hidden="true" /></span>
        <div>
          <h2 id="room-people-title" className="text-xl font-black tracking-tight">In this room</h2>
          <p className="text-sm text-muted-foreground">Host and guests</p>
        </div>
      </div>
      <ul className="mt-6 space-y-2" data-testid="participant-list">
        <li className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
          <span className="font-semibold">Host</span><span className="text-xs text-[#ffc16f]">Room owner</span>
        </li>
        {participants.map((person) => (
          <li key={person.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3" data-testid="participant">
            <span className="min-w-0 truncate font-semibold">{person.label}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground"><Circle className={`size-2 fill-current ${person.online ? "text-[#ffbd56]" : "text-[#93858c]"}`} aria-hidden="true" />{person.online ? "Here" : "Away"}</span>
          </li>
        ))}
      </ul>
      {participants.length === 0 && status === "connected" ? <p className="mt-5 text-sm text-muted-foreground">No guests yet. Share the code to bring them in.</p> : null}
      {status === "loading" ? <p role="status" className="mt-5 text-sm text-muted-foreground">Loading guests…</p> : null}
      {status === "reconnecting" ? <p role="status" className="mt-5 text-sm text-[#ffc16f]">Connection interrupted. Reconnecting…</p> : null}
      {status === "ended" ? <p role="alert" className="mt-5 text-sm text-[#ffb0a2]">This room ended or your access expired. Return to Join to enter a new code.</p> : null}
    </section>
  );
}
