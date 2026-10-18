export class InvalidDisplayNameError extends Error {
  constructor() {
    super("Use 2–24 letters, numbers, spaces, apostrophes, dots, or hyphens for your name.");
  }
}

export function normalizeDisplayName(value: unknown): string {
  if (typeof value !== "string") throw new InvalidDisplayNameError();
  const name = value.normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (name.length < 2 || name.length > 24 || !/^[\p{L}\p{N} .'-]+$/u.test(name)) {
    throw new InvalidDisplayNameError();
  }
  return name;
}

export function displayLabel(name: string, number: number): string {
  return number === 1 ? name : `${name} (${number})`;
}
