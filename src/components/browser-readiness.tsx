"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, CircleAlert, CircleX } from "lucide-react";
import {
  browserReadinessSummary,
  evaluateBrowserReadiness,
  type BrowserCapabilityFacts,
  type ReadinessStatus,
} from "@/lib/compatibility/rules";

const SERVER_SNAPSHOT = "checking";

function subscribe() {
  return () => undefined;
}

function hasLocalStorage() {
  try {
    return typeof window.localStorage !== "undefined";
  } catch {
    return false;
  }
}

function getBrowserSnapshot() {
  const browserWindow = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  const facts: BrowserCapabilityFacts = {
    secureContext: window.isSecureContext,
    localStorage: hasLocalStorage(),
    webSocket: typeof window.WebSocket === "function",
    mediaDevices: Boolean(navigator.mediaDevices?.getUserMedia),
    audioContext: Boolean(window.AudioContext ?? browserWindow.webkitAudioContext),
  };

  return [
    facts.secureContext,
    facts.localStorage,
    facts.webSocket,
    facts.mediaDevices,
    facts.audioContext,
  ].map((value) => (value ? "1" : "0")).join("");
}

function decodeSnapshot(snapshot: string): BrowserCapabilityFacts {
  return {
    secureContext: snapshot[0] === "1",
    localStorage: snapshot[1] === "1",
    webSocket: snapshot[2] === "1",
    mediaDevices: snapshot[3] === "1",
    audioContext: snapshot[4] === "1",
  };
}

const statusPresentation: Record<ReadinessStatus, {
  label: string;
  className: string;
  icon: typeof CheckCircle2;
}> = {
  ready: {
    label: "Detected",
    className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-200",
    icon: CheckCircle2,
  },
  limited: {
    label: "Limited",
    className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
    icon: CircleAlert,
  },
  unavailable: {
    label: "Unavailable",
    className: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    icon: CircleX,
  },
};

export function BrowserReadiness() {
  const snapshot = useSyncExternalStore(subscribe, getBrowserSnapshot, () => SERVER_SNAPSHOT);

  if (snapshot === SERVER_SNAPSHOT) {
    return (
      <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="browser-readiness-title" aria-live="polite">
        <p className="eyebrow">This browser</p>
        <h2 id="browser-readiness-title" className="mt-4 text-2xl font-black tracking-tight">Checking browser capabilities…</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">No permissions are requested by this check.</p>
      </section>
    );
  }

  const checks = evaluateBrowserReadiness(decodeSnapshot(snapshot));

  return (
    <section className="feature-panel rounded-[1.75rem] p-6 sm:p-8" aria-labelledby="browser-readiness-title">
      <p className="eyebrow">This browser</p>
      <h2 id="browser-readiness-title" className="mt-4 text-2xl font-black tracking-tight">Browser capability check</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-[#c9bec3]" aria-live="polite">
        {browserReadinessSummary(checks)}
      </p>

      <ul className="mt-7 grid gap-3" data-testid="browser-readiness-checks">
        {checks.map((check) => {
          const presentation = statusPresentation[check.status];
          const Icon = presentation.icon;
          return (
            <li key={check.id} className="rounded-2xl border border-white/10 bg-black/15 p-4 sm:flex sm:items-start sm:justify-between sm:gap-6">
              <div className="flex gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-[#ffad69]" aria-hidden="true" />
                <div>
                  <h3 className="font-bold text-white">{check.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{check.detail}</p>
                </div>
              </div>
              <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em] sm:mt-0 ${presentation.className}`}>
                {presentation.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        This is an API-presence check only. It does not request microphone permission, inspect devices, upload data, or prove real-device compatibility.
      </p>
    </section>
  );
}
