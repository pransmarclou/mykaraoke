import assert from "node:assert/strict";
import test from "node:test";
import {
  browserReadinessSummary,
  evaluateBrowserReadiness,
  type BrowserCapabilityFacts,
} from "../../src/lib/compatibility/rules";

const readyFacts: BrowserCapabilityFacts = {
  secureContext: true,
  localStorage: true,
  webSocket: true,
  mediaDevices: true,
  audioContext: true,
};

test("a capable browser reports each required building block as detected", () => {
  const checks = evaluateBrowserReadiness(readyFacts);
  assert.deepEqual(checks.map((check) => check.status), ["ready", "ready", "ready", "ready"]);
  assert.equal(browserReadinessSummary(checks), "Core party capabilities are present in this browser.");
});

test("missing WebSocket support accurately describes the polling fallback", () => {
  const checks = evaluateBrowserReadiness({ ...readyFacts, webSocket: false });
  const liveUpdates = checks.find((check) => check.id === "live-updates");
  assert.equal(liveUpdates?.status, "limited");
  assert.match(liveUpdates?.detail ?? "", /snapshot polling/);
  assert.match(browserReadinessSummary(checks), /limitations/);
});

test("storage restrictions do not overstate a core room failure", () => {
  const storage = evaluateBrowserReadiness({ ...readyFacts, localStorage: false })
    .find((check) => check.id === "browser-storage");
  assert.equal(storage?.status, "limited");
  assert.match(storage?.detail ?? "", /themes and favorites/);
});

test("microphone readiness requires secure capture and Web Audio APIs", () => {
  for (const unavailable of [
    { ...readyFacts, secureContext: false },
    { ...readyFacts, mediaDevices: false },
    { ...readyFacts, audioContext: false },
  ]) {
    const microphone = evaluateBrowserReadiness(unavailable)
      .find((check) => check.id === "microphone-studio");
    assert.equal(microphone?.status, "unavailable");
  }
});
