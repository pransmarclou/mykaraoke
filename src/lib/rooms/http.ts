import { buildJoinUrl } from "@/lib/rooms/room-code";

export const HOST_COOKIE_NAME = "mk_host_session";
export const GUEST_COOKIE_NAME = "mk_guest_session";
export const TV_COOKIE_NAME = "mk_tv_session";

export function configuredAppOrigin(): string {
  const value = process.env.APP_ORIGIN;
  if (!value) throw new Error("APP_ORIGIN is not configured");
  // Validate the origin through the same boundary used for share links.
  return new URL(buildJoinUrl(value, "ABC234")).origin;
}

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === configuredAppOrigin();
}
