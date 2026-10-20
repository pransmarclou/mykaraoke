import { normalizeDisplayName } from "@/lib/rooms/display-name";

export type SingerAssignment = {
  singerName: string;
  duetSingerName?: string | null;
};

export class SingerAssignmentError extends Error {
  constructor(public readonly reason: "same_singer") {
    super(reason);
  }
}

function singerKey(name: string): string {
  return name.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

export function normalizeSingerAssignment(singerName: unknown, duetSingerName?: unknown): SingerAssignment {
  const primary = normalizeDisplayName(singerName);
  if (duetSingerName === undefined || duetSingerName === null || duetSingerName === "") {
    return { singerName: primary, duetSingerName: null };
  }

  const partner = normalizeDisplayName(duetSingerName);
  if (singerKey(primary) === singerKey(partner)) throw new SingerAssignmentError("same_singer");
  return { singerName: primary, duetSingerName: partner };
}

export function singerLabel(assignment: SingerAssignment): string {
  return assignment.duetSingerName
    ? `${assignment.singerName} & ${assignment.duetSingerName}`
    : assignment.singerName;
}

export function performerKey(assignment: SingerAssignment): string {
  const keys = [singerKey(assignment.singerName)];
  if (assignment.duetSingerName) keys.push(singerKey(assignment.duetSingerName));
  return keys.sort().join("\u0000");
}
