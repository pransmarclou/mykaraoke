"use client";

import { useState, type ReactNode } from "react";
import { ListMusic, MonitorPlay, Trophy, UsersRound } from "lucide-react";

type ControlTarget = "songs" | "stage" | "scores" | "people";

type GuestRoomConsoleProps = {
  songs: ReactNode;
  stage: ReactNode;
  scores: ReactNode;
  people: ReactNode;
};

const controls = [
  { id: "songs", label: "Songs", icon: ListMusic },
  { id: "stage", label: "Stage", icon: MonitorPlay },
  { id: "scores", label: "Scores", icon: Trophy },
  { id: "people", label: "People", icon: UsersRound },
] as const;

export function GuestRoomConsole({ songs, stage, scores, people }: GuestRoomConsoleProps) {
  const [activeTarget, setActiveTarget] = useState<ControlTarget>("songs");
  const panels: Record<ControlTarget, ReactNode> = { songs, stage, scores, people };

  function jumpTo(target: ControlTarget) {
    setActiveTarget(target);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(`guest-control-${target}`)?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  return (
    <div className="pb-24 md:pb-0">
      <nav
        aria-label="Phone room controls"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 mx-auto grid max-w-lg grid-cols-4 overflow-hidden rounded-2xl border border-white/15 bg-[#12121c]/95 p-1.5 shadow-[0_18px_60px_rgba(0,0,0,.55)] backdrop-blur-xl md:static md:mb-6 md:max-w-none"
      >
        {controls.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-current={activeTarget === id ? "location" : undefined}
            onClick={() => jumpTo(id)}
            className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-2 text-xs font-bold transition sm:flex-row sm:text-sm ${
              activeTarget === id
                ? "bg-primary text-white shadow-[0_8px_24px_rgba(217,35,98,.25)]"
                : "text-muted-foreground hover:bg-white/[0.06] hover:text-white"
            }`}
          >
            <Icon className="size-5 sm:size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-6 md:grid-cols-2">
        {controls.map(({ id }) => (
          <div
            key={id}
            id={`guest-control-${id}`}
            className={`scroll-mt-24 ${id === "songs" ? "md:col-span-2" : ""}`}
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </div>
  );
}
