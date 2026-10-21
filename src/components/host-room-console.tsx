"use client";

import { useState, type ReactNode } from "react";
import { ListMusic, Mic2, Trophy, UsersRound } from "lucide-react";

type ConsoleTab = "queue" | "scores" | "studio" | "people";

type HostRoomConsoleProps = {
  queue: ReactNode;
  scores: ReactNode;
  studio: ReactNode;
  people: ReactNode;
};

const tabs = [
  { id: "queue", label: "Up next", icon: ListMusic },
  { id: "scores", label: "Scores", icon: Trophy },
  { id: "studio", label: "Studio", icon: Mic2 },
  { id: "people", label: "People", icon: UsersRound },
] as const;

export function HostRoomConsole({ queue, scores, studio, people }: HostRoomConsoleProps) {
  const [activeTab, setActiveTab] = useState<ConsoleTab>("queue");
  const panels: Record<ConsoleTab, ReactNode> = { queue, scores, studio, people };

  return (
    <section className="min-w-0" aria-label="Room controls">
      <div
        role="tablist"
        aria-label="Room control sections"
        className="grid grid-cols-4 overflow-hidden rounded-t-[1.5rem] border border-b-0 border-white/10 bg-black/20"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`host-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`host-panel-${id}`}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => setActiveTab(id)}
            onKeyDown={(event) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
              event.preventDefault();
              const currentIndex = tabs.findIndex((tab) => tab.id === id);
              const nextIndex = event.key === "Home"
                ? 0
                : event.key === "End"
                  ? tabs.length - 1
                  : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
              const nextId = tabs[nextIndex].id;
              setActiveTab(nextId);
              document.getElementById(`host-tab-${nextId}`)?.focus();
            }}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 border-b-2 px-2 text-xs font-bold transition sm:flex-row sm:text-sm ${
              activeTab === id
                ? "border-accent bg-white/[0.07] text-white"
                : "border-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-white"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {tabs.map(({ id }) => (
        <div
          key={id}
          id={`host-panel-${id}`}
          role="tabpanel"
          aria-labelledby={`host-tab-${id}`}
          tabIndex={0}
          hidden={activeTab !== id}
          className="[&>.feature-panel]:rounded-t-none [&>.feature-panel]:border-t-0"
        >
          {panels[id]}
        </div>
      ))}
    </section>
  );
}
