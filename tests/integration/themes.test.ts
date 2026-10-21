import assert from "node:assert/strict";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { playbackSnapshot } from "../../src/lib/playback/state";
import { createHostRoom } from "../../src/lib/rooms/repository";
import { queueSnapshot } from "../../src/lib/songs/queue";
import {
  readRoomPartyTheme,
  updateRoomPartyTheme,
} from "../../src/lib/themes/state";

const rooms: string[] = [];

after(async () => {
  if (rooms.length) {
    await getDb().query(
      "delete from public.rooms where id = any($1::uuid[])",
      [rooms],
    );
  }
  await getDb().end();
});

test("room themes default safely and reach queue and playback snapshots", async () => {
  const host = await createHostRoom();
  rooms.push(host.room.id);
  const client = await getDb().connect();
  try {
    assert.equal(await readRoomPartyTheme(client, host.room.id), "stage-glow");
  } finally {
    client.release();
  }
  assert.equal((await queueSnapshot(host.room.id)).partyTheme, "stage-glow");
  assert.equal((await playbackSnapshot(host.room.id)).partyTheme, "stage-glow");

  const before = await queueSnapshot(host.room.id);
  const changed = await updateRoomPartyTheme(host.room.id, "electric-blue");
  assert.equal(changed.partyTheme, "electric-blue");
  assert.equal(changed.version, before.version + 1);
  assert.equal((await queueSnapshot(host.room.id)).partyTheme, "electric-blue");
  assert.equal((await playbackSnapshot(host.room.id)).partyTheme, "electric-blue");
});

test("room theme constraints and RLS reject unsupported or public writes", async () => {
  const host = await createHostRoom();
  rooms.push(host.room.id);
  await assert.rejects(updateRoomPartyTheme(host.room.id, "custom-css"));

  for (const role of ["anon", "authenticated"]) {
    const client = await getDb().connect();
    try {
      await client.query("begin");
      await client.query(`set local role ${role}`);
      await assert.rejects(
        client.query(
          "update public.room_settings set party_theme = 'velvet-gold'",
        ),
        (error: unknown) => (error as { code?: string }).code === "42501",
      );
    } finally {
      await client.query("rollback");
      client.release();
    }
  }
});
