import assert from "node:assert/strict";
import test from "node:test";
import { canUse, DEFAULT_GUEST_PERMISSIONS, parseGuestPermissionPatch } from "../../src/lib/permissions/rules";

test("defaults keep the pre-permission room behavior", () => {
  assert.deepEqual(DEFAULT_GUEST_PERMISSIONS, { addSongs: true, queueControl: false, playbackControl: false, reactions: true });
});

test("hosts are always allowed and guests follow the room permissions", () => {
  const locked = { addSongs: false, queueControl: false, playbackControl: false, reactions: false };
  for (const permission of ["addSongs", "queueControl", "playbackControl", "reactions"] as const) {
    assert.equal(canUse("host", locked, permission), true);
    assert.equal(canUse("guest", locked, permission), false);
    assert.equal(canUse("guest", { ...locked, [permission]: true }, permission), true);
  }
});

test("permission patches accept only known boolean fields", () => {
  assert.deepEqual(parseGuestPermissionPatch({ playbackControl: true }), { playbackControl: true });
  assert.deepEqual(parseGuestPermissionPatch({ addSongs: false, reactions: true }), { addSongs: false, reactions: true });
  for (const invalid of [null, [], {}, "on", { playbackControl: "true" }, { admin: true }, { addSongs: true, host: true }]) {
    assert.equal(parseGuestPermissionPatch(invalid), null);
  }
});
