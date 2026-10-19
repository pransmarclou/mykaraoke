export type MicrophoneStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "monitoring"
  | "denied"
  | "no-device"
  | "disconnected"
  | "suspended"
  | "error"
  | "unsupported";

export type MicrophoneEvent =
  | "request"
  | "grant"
  | "monitor"
  | "stop-monitor"
  | "deny"
  | "missing"
  | "disconnect"
  | "suspend"
  | "resume"
  | "fail"
  | "unsupported";

export interface MicrophoneCapabilityInput {
  secureContext: boolean;
  mediaDevices: boolean;
  audioContext: boolean;
  outputSelection: boolean;
}

export interface MicrophoneCapability extends MicrophoneCapabilityInput {
  supported: boolean;
  reason: "insecure" | "media-devices" | "audio-context" | null;
}

export const MICROPHONE_LIMITS = {
  inputGain: { min: 0, max: 2 },
  outputVolume: { min: 0, max: 1 },
  reverbMix: { min: 0, max: 0.6 },
} as const;

export function clampMicrophoneParameter(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function detectMicrophoneCapability(input: MicrophoneCapabilityInput): MicrophoneCapability {
  const reason = !input.secureContext
    ? "insecure"
    : !input.mediaDevices
      ? "media-devices"
      : !input.audioContext
        ? "audio-context"
        : null;
  return { ...input, supported: reason === null, reason };
}

export function microphoneErrorEvent(errorName: string): MicrophoneEvent {
  if (["NotAllowedError", "SecurityError"].includes(errorName)) return "deny";
  if (["NotFoundError", "DevicesNotFoundError"].includes(errorName)) return "missing";
  return "fail";
}

export function microphoneTransition(status: MicrophoneStatus, event: MicrophoneEvent): MicrophoneStatus {
  if (event === "unsupported") return "unsupported";
  if (event === "request") return "requesting";
  if (event === "deny") return "denied";
  if (event === "missing") return "no-device";
  if (event === "disconnect") return "disconnected";
  if (event === "fail") return "error";
  if (event === "grant") return "ready";
  if (event === "suspend" && ["ready", "monitoring"].includes(status)) return "suspended";
  if (event === "resume" && status === "suspended") return "monitoring";
  if (event === "monitor" && ["ready", "suspended"].includes(status)) return "monitoring";
  if (event === "stop-monitor" && ["monitoring", "suspended"].includes(status)) return "ready";
  return status;
}
