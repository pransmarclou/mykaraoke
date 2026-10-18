import assert from "node:assert/strict";
import { test } from "node:test";
import { displayLabel, InvalidDisplayNameError, normalizeDisplayName } from "../../src/lib/rooms/display-name";
import { isPresent, presenceReducer, PRESENCE_LEASE_MS } from "../../src/lib/rooms/presence";

test("display names normalize whitespace and Unicode, but reject unsafe or unusable input", () => {
  assert.equal(normalizeDisplayName("  Ana   Maria  "), "Ana Maria");
  assert.equal(normalizeDisplayName("  Ａｌｅｘ  "), "Alex");
  assert.equal(normalizeDisplayName("Élodie"), "Élodie");
  for (const value of ["A", "", "  ", "<script>", "A_2", "x".repeat(25), 7]) {
    assert.throws(() => normalizeDisplayName(value), InvalidDisplayNameError);
  }
  assert.equal(displayLabel("Alex", 1), "Alex");
  assert.equal(displayLabel("Alex", 2), "Alex (2)");
});

test("presence lease is alive before 30 seconds and away at the boundary", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");
  assert.equal(isPresent(null, now), false);
  assert.equal(isPresent(new Date(now.getTime() - PRESENCE_LEASE_MS + 1), now), true);
  assert.equal(isPresent(new Date(now.getTime() - PRESENCE_LEASE_MS), now), false);
});

test("presence reducer retains the roster through interruption and clears it when room ends", () => {
  const guest = { id: "guest-1", label: "Alex", online: true };
  const loaded = presenceReducer({ participants: [], status: "loading" }, { type: "snapshot", participants: [guest] });
  assert.deepEqual(loaded, { participants: [guest], status: "connected" });
  const interrupted = presenceReducer(loaded, { type: "interrupted" });
  assert.deepEqual(interrupted, { participants: [guest], status: "reconnecting" });
  assert.deepEqual(presenceReducer(interrupted, { type: "ended" }), { participants: [], status: "ended" });
});
