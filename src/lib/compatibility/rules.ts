export type ReadinessStatus = "ready" | "limited" | "unavailable";

export interface BrowserCapabilityFacts {
  secureContext: boolean;
  localStorage: boolean;
  webSocket: boolean;
  mediaDevices: boolean;
  audioContext: boolean;
}

export interface BrowserReadinessCheck {
  id: "secure-context" | "browser-storage" | "live-updates" | "microphone-studio";
  label: string;
  status: ReadinessStatus;
  detail: string;
}

export function evaluateBrowserReadiness(
  facts: BrowserCapabilityFacts,
): BrowserReadinessCheck[] {
  return [
    {
      id: "secure-context",
      label: "Secure connection",
      status: facts.secureContext ? "ready" : "limited",
      detail: facts.secureContext
        ? "This page has the secure browser context required by protected media features."
        : "Open the deployed HTTPS site. Microphone access is normally blocked on an insecure connection.",
    },
    {
      id: "browser-storage",
      label: "Browser storage",
      status: facts.localStorage ? "ready" : "limited",
      detail: facts.localStorage
        ? "This browser can keep personal theme and favorite choices on this device."
        : "Private-mode or storage restrictions may prevent local themes and favorites from persisting.",
    },
    {
      id: "live-updates",
      label: "Live room updates",
      status: facts.webSocket ? "ready" : "limited",
      detail: facts.webSocket
        ? "The browser exposes WebSocket support for fast room invalidations."
        : "The room can fall back to snapshot polling, but updates may arrive more slowly.",
    },
    {
      id: "microphone-studio",
      label: "Local Microphone Studio",
      status:
        facts.secureContext && facts.mediaDevices && facts.audioContext
          ? "ready"
          : "unavailable",
      detail:
        facts.secureContext && facts.mediaDevices && facts.audioContext
          ? "The required browser APIs are present. Hardware, permission, latency, and feedback still need a real test."
          : "This browser is missing a secure context, microphone capture, or Web Audio support.",
    },
  ];
}

export function browserReadinessSummary(checks: BrowserReadinessCheck[]) {
  if (checks.some((check) => check.status === "unavailable")) {
    return "Core party controls may work, but at least one optional browser feature is unavailable.";
  }
  if (checks.some((check) => check.status === "limited")) {
    return "Core party capabilities are present with browser limitations to review below.";
  }
  return "Core party capabilities are present in this browser.";
}
