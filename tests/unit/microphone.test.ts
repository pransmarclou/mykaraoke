import assert from "node:assert/strict";
import test from "node:test";
import {
  clampMicrophoneParameter,
  detectMicrophoneCapability,
  isAppleMobileDevice,
  microphoneAudioConstraint,
  microphoneErrorEvent,
  microphoneTransition,
} from "../../src/lib/microphone/rules";

test("microphone parameters stay inside safe graph bounds", () => {
  assert.equal(clampMicrophoneParameter(-1, 0, 2), 0);
  assert.equal(clampMicrophoneParameter(1.25, 0, 2), 1.25);
  assert.equal(clampMicrophoneParameter(4, 0, 2), 2);
  assert.equal(clampMicrophoneParameter(Number.NaN, 0, 2), 0);
});

test("iPhone and touch iPad capture use the system microphone route", () => {
  assert.equal(isAppleMobileDevice({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 }), true);
  assert.equal(isAppleMobileDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isAppleMobileDevice({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X)", platform: "MacIntel", maxTouchPoints: 0 }), false);
  assert.equal(microphoneAudioConstraint("external-device", true), true);
  assert.deepEqual(microphoneAudioConstraint("built-in", false), {
    deviceId: { exact: "built-in" },
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  });
});

test("capability detection requires a secure capture and audio environment", () => {
  assert.deepEqual(detectMicrophoneCapability({ secureContext: false, mediaDevices: true, audioContext: true, outputSelection: false }), {
    secureContext: false, mediaDevices: true, audioContext: true, outputSelection: false, supported: false, reason: "insecure",
  });
  assert.equal(detectMicrophoneCapability({ secureContext: true, mediaDevices: true, audioContext: true, outputSelection: false }).supported, true);
});

test("permission and device errors map to recoverable UI states", () => {
  assert.equal(microphoneErrorEvent("NotAllowedError"), "deny");
  assert.equal(microphoneErrorEvent("NotFoundError"), "missing");
  assert.equal(microphoneErrorEvent("NotReadableError"), "fail");
});

test("the microphone state machine requires explicit monitoring", () => {
  assert.equal(microphoneTransition("idle", "request"), "requesting");
  assert.equal(microphoneTransition("requesting", "grant"), "ready");
  assert.equal(microphoneTransition("ready", "monitor"), "monitoring");
  assert.equal(microphoneTransition("monitoring", "suspend"), "suspended");
  assert.equal(microphoneTransition("suspended", "resume"), "monitoring");
  assert.equal(microphoneTransition("monitoring", "disconnect"), "disconnected");
});
