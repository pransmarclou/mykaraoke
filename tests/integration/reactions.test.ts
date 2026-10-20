import assert from "node:assert/strict";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { ReactionError, reserveReaction } from "../../src/lib/reactions/state";
import { createHostRoom } from "../../src/lib/rooms/repository";

const rooms: string[] = [];

after(async () => {
  if (rooms.length) await getDb().query("delete from public.rooms where id = any($1::uuid[])", [rooms]);
  await getDb().end();
});
test("reaction budgets are per actor and reset after the fixed window", async () => {
  const host = await createHostRoom();
  rooms.push(host.room.id);
  const client = await getDb().connect();
  const now = new Date("2026-10-20T12:00:00.000Z");
  try {
    await client.query("begin");
    await reserveReaction(client, host.room.id, "host", 2, now);
    await reserveReaction(client, host.room.id, "host", 2, now);
    await assert.rejects(
      reserveReaction(client, host.room.id, "host", 2, now),
      (error: unknown) => error instanceof ReactionError && error.reason === "limited",
    );
    await client.query("rollback");

    await client.query("begin");
    await reserveReaction(client, host.room.id, "host", 2, now);
    await reserveReaction(client, host.room.id, "guest:test", 2, now);
    await reserveReaction(client, host.room.id, "host", 2, new Date(now.getTime() + 10_001));
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
});

test("public database roles cannot read or mutate reaction budgets", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const statement of [
      "select * from public.reaction_limits limit 1",
      "insert into public.reaction_limits default values",
      "update public.reaction_limits set reactions = reactions",
      "delete from public.reaction_limits",
    ]) {
      const client = await getDb().connect();
      try {
        await client.query("begin");
        await client.query(`set local role ${role}`);
        await assert.rejects(client.query(statement), (error: unknown) => (error as { code?: string }).code === "42501");
      } finally {
        await client.query("rollback");
        client.release();
      }
    }
  }
});
