export type GuestPermissions = {
  addSongs: boolean;
  queueControl: boolean;
  playbackControl: boolean;
  reactions: boolean;
};
export type GuestPermission = keyof GuestPermissions;

export const GUEST_PERMISSIONS: readonly { id: GuestPermission; label: string; description: string }[] = [
  { id: "addSongs", label: "Add songs", description: "Guests can search and add songs to the queue." },
  { id: "playbackControl", label: "Remote control", description: "Guest phones can start, pause, resume, and skip on the TV." },
  { id: "queueControl", label: "Manage queue", description: "Guests can move, skip, and remove waiting songs." },
  { id: "reactions", label: "Reactions", description: "Guests can cheer the singer on the TV." },
];

// Preserves the behavior rooms had before permissions were configurable.
export const DEFAULT_GUEST_PERMISSIONS: GuestPermissions = {
  addSongs: true,
  queueControl: false,
  playbackControl: false,
  reactions: true,
};

export function canUse(role: "host" | "guest", permissions: GuestPermissions, permission: GuestPermission): boolean {
  return role === "host" || permissions[permission];
}

export function parseGuestPermissionPatch(value: unknown): Partial<GuestPermissions> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0) return null;
  const known = new Set<string>(GUEST_PERMISSIONS.map((item) => item.id));
  const patch: Partial<GuestPermissions> = {};
  for (const [key, enabled] of entries) {
    if (!known.has(key) || typeof enabled !== "boolean") return null;
    patch[key as GuestPermission] = enabled;
  }
  return patch;
}
