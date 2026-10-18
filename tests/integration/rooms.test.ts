import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, test } from "node:test";
import { getDb } from "../../src/lib/db";
import { makeRoomCode } from "../../src/lib/rooms/room-code";
import { reserveRoomCreationSlot, reserveRoomJoinSlot, RoomCreationRateLimitError, RoomJoinRateLimitError } from "../../src/lib/rooms/rate-limit";
import { closeHostRoom, createHostRoom, getActiveHostRoom } from "../../src/lib/rooms/repository";
import { getActiveGuest, joinRoom, leaveRoom, roomAccess, roomParticipants, RoomJoinError, touchGuestPresence } from "../../src/lib/rooms/guests";

const createdRoomIds: string[] = [];
const rateLimitKeys: Buffer[] = [];
const joinLimitKeys: Buffer[] = [];

after(async () => {
  if (createdRoomIds.length > 0) {
    await getDb().query("delete from public.rooms where id = any($1::uuid[])", [createdRoomIds]);
  }
  for (const key of rateLimitKeys) {
    await getDb().query("delete from public.room_creation_limits where client_key = $1", [key]);
  }
  for (const key of joinLimitKeys) {
    await getDb().query("delete from public.room_join_limits where client_key = $1", [key]);
  }
  await getDb().end();
});

test("room persists, host recovers, room code does not authorize, and close revokes", async () => {
  const { room, credential } = await createHostRoom();
  createdRoomIds.push(room.id);
  const stored = await getDb().query<{ credential_hash: Buffer }>("select credential_hash from public.room_sessions where room_id = $1", [room.id]);
  assert.equal(stored.rows.length, 1);
  assert.notEqual(stored.rows[0].credential_hash.toString("hex"), credential);

  assert.equal((await getActiveHostRoom(credential))?.code, room.code);
  assert.equal(await getActiveHostRoom(room.code), null);
  assert.equal(await closeHostRoom(room.code, undefined), false);
  assert.equal(await closeHostRoom(room.code, "0".repeat(64)), false);
  assert.equal(await closeHostRoom(room.code, credential), true);
  assert.equal(await getActiveHostRoom(credential), null);
});

test("room-code collision retries instead of overwriting the existing room", async () => {
  const original = await createHostRoom();
  createdRoomIds.push(original.room.id);
  const alternative = makeRoomCode();
  let call = 0;
  const collided = await createHostRoom({ codeGenerator: () => (call++ === 0 ? original.room.code : alternative === original.room.code ? makeRoomCode() : alternative) });
  createdRoomIds.push(collided.room.id);
  assert.notEqual(collided.room.code, original.room.code);
  assert.equal((await getActiveHostRoom(original.credential))?.code, original.room.code);
  assert.equal((await getActiveHostRoom(collided.credential))?.code, collided.room.code);
});

test("expired room does not restore host access", async () => {
  const now = new Date(Date.now() - 25 * 60 * 60 * 1000);
  const { room, credential } = await createHostRoom({ now });
  createdRoomIds.push(room.id);
  assert.equal(await getActiveHostRoom(credential), null);
  assert.equal(await closeHostRoom(room.code, credential), false);
});

test("database-backed room creation limit is atomic and resets after one hour", async () => {
  const key = randomBytes(32);
  rateLimitKeys.push(key);
  const now = new Date();
  await reserveRoomCreationSlot(key, 2, now);
  await reserveRoomCreationSlot(key, 2, now);
  await assert.rejects(reserveRoomCreationSlot(key, 2, now), RoomCreationRateLimitError);
  await reserveRoomCreationSlot(key, 2, new Date(now.getTime() + 60 * 60 * 1000 + 1));
});

test("database-backed join attempt limit is atomic and resets after one hour", async () => {
  const key = randomBytes(32);
  joinLimitKeys.push(key);
  const now = new Date();
  await reserveRoomJoinSlot(key, 2, now);
  await reserveRoomJoinSlot(key, 2, now);
  await assert.rejects(reserveRoomJoinSlot(key, 2, now), RoomJoinRateLimitError);
  await reserveRoomJoinSlot(key, 2, new Date(now.getTime() + 60 * 60 * 1000 + 1));
});

test("guests join, receive stable scoped identities, distinguish duplicate names, and leave", async () => {
  const firstRoom = await createHostRoom();
  const secondRoom = await createHostRoom();
  createdRoomIds.push(firstRoom.room.id, secondRoom.room.id);
  const one = await joinRoom(firstRoom.room.code, "Alex", undefined);
  const repeated = await joinRoom(firstRoom.room.code, "Ignored", one.credential);
  assert.equal(repeated.reused, true);
  assert.equal(repeated.guest.id, one.guest.id);
  assert.equal(repeated.guest.label, "Alex");
  const two = await joinRoom(firstRoom.room.code, "Alex", undefined);
  assert.equal(two.guest.label, "Alex (2)");
  assert.equal((await getActiveGuest(firstRoom.room.code, one.credential))?.id, one.guest.id);
  assert.equal(await getActiveGuest(secondRoom.room.code, one.credential), null);
  assert.deepEqual(await roomAccess(firstRoom.room.code, firstRoom.credential, undefined), { roomId: firstRoom.room.id, role: "host" });
  assert.equal((await roomAccess(firstRoom.room.code, undefined, one.credential)).guestId, one.guest.id);
  await assert.rejects(roomAccess(secondRoom.room.code, undefined, one.credential), /access denied/);
  assert.deepEqual((await roomParticipants(firstRoom.room.id)).map((person) => person.label), ["Alex", "Alex (2)"]);

  await getDb().query("update public.room_presence set last_seen_at = now() - interval '31 seconds' where member_id = $1", [one.guest.id]);
  assert.equal((await roomParticipants(firstRoom.room.id)).find((person) => person.id === one.guest.id)?.online, false);
  await touchGuestPresence(one.guest.id);
  assert.equal((await roomParticipants(firstRoom.room.id)).find((person) => person.id === one.guest.id)?.online, true);
  assert.equal(await leaveRoom(firstRoom.room.code, one.credential), true);
  assert.equal(await getActiveGuest(firstRoom.room.code, one.credential), null);
  assert.deepEqual((await roomParticipants(firstRoom.room.id)).map((person) => person.label), ["Alex (2)"]);
  assert.equal(await leaveRoom(secondRoom.room.code, two.credential), false);
  assert.equal((await getActiveGuest(firstRoom.room.code, two.credential))?.id, two.guest.id);
});

test("unknown, expired, and ended rooms cannot be joined", async () => {
  await assert.rejects(joinRoom("ABC234", "Guest", undefined), (error: unknown) => error instanceof RoomJoinError && error.reason === "not_found");
  const expired = await createHostRoom({ now: new Date(Date.now() - 25 * 60 * 60 * 1000) });
  createdRoomIds.push(expired.room.id);
  await assert.rejects(joinRoom(expired.room.code, "Guest", undefined), (error: unknown) => error instanceof RoomJoinError && error.reason === "ended");
  const ended = await createHostRoom();
  createdRoomIds.push(ended.room.id);
  assert.equal(await closeHostRoom(ended.room.code, ended.credential), true);
  await assert.rejects(joinRoom(ended.room.code, "Guest", undefined), (error: unknown) => error instanceof RoomJoinError && error.reason === "ended");
});

test("anonymous and authenticated database roles cannot read or mutate room tables", async () => {
  for (const role of ["anon", "authenticated"]) {
    for (const table of ["rooms", "room_settings", "room_sessions", "room_creation_limits", "room_members", "room_presence", "room_join_limits"]) {
      const updateColumn = table === "room_creation_limits" || table === "room_join_limits" ? "window_started_at" : table === "room_presence" ? "last_seen_at" : table === "room_members" ? "joined_at" : "created_at";
      for (const statement of [
        `select * from public.${table} limit 1`,
        `insert into public.${table} default values`,
        `update public.${table} set ${updateColumn} = ${updateColumn}`,
        `delete from public.${table}`,
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
  }
});
