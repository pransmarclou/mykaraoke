import { createHmac } from "node:crypto";
import { configuredAppOrigin } from "@/lib/rooms/http";

export function remoteMicTopic(secret: string | undefined, queueTopic: string, itemId: string, guestId: string): string | null {
  if (!secret || secret.length < 32) return null;
  const capability = createHmac("sha256", secret).update(`${queueTopic}:${itemId}:${guestId}`, "utf8").digest("hex");
  return `mic:${queueTopic}:${capability}`;
}

export function configuredRemoteMicTopic(queueTopic: string, itemId: string, guestId: string): string | null {
  const hostname = new URL(configuredAppOrigin()).hostname;
  const secret = ["localhost", "127.0.0.1"].includes(hostname)
    ? "mykaraoke-local-development-remote-microphone"
    : process.env.ROOM_RATE_LIMIT_SECRET;
  return remoteMicTopic(secret, queueTopic, itemId, guestId);
}
