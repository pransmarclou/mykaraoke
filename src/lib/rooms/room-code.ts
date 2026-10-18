import { createHash, randomBytes, randomInt } from "node:crypto";
import { normalizeRoomCode } from "@/lib/rooms/room-code-format";

export { normalizeRoomCode } from "@/lib/rooms/room-code-format";

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;
export const ROOM_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function isValidRoomCode(value: string): boolean {
  const code = normalizeRoomCode(value);
  return code.length === ROOM_CODE_LENGTH && [...code].every((character) => ROOM_CODE_ALPHABET.includes(character));
}

export function makeRoomCode(): string {
  return Array.from({ length: ROOM_CODE_LENGTH }, () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)]).join("");
}

export function roomExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + ROOM_LIFETIME_MS);
}

export function buildJoinUrl(appOrigin: string, code: string): string {
  if (!isValidRoomCode(code)) throw new Error("Invalid room code");
  const origin = new URL(appOrigin);
  if (!(["https:", "http:"].includes(origin.protocol) && origin.username === "" && origin.password === "" && origin.pathname === "/" && !origin.search && !origin.hash)) {
    throw new Error("APP_ORIGIN must be a plain HTTP(S) origin");
  }
  if (origin.protocol === "http:" && !["localhost", "127.0.0.1"].includes(origin.hostname)) {
    throw new Error("APP_ORIGIN must use HTTPS outside localhost");
  }
  const url = new URL("/join", origin);
  url.searchParams.set("code", normalizeRoomCode(code));
  return url.toString();
}

export function newHostCredential(): string {
  return randomBytes(32).toString("hex");
}

export function credentialDigest(credential: string): Buffer | null {
  if (!/^[a-f0-9]{64}$/.test(credential)) return null;
  return createHash("sha256").update(Buffer.from(credential, "hex")).digest();
}
