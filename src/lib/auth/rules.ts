export type AuthFormState = {
  status: "idle" | "error" | "success";
  message: string;
  fieldErrors?: Partial<Record<"displayName" | "email" | "password" | "confirmPassword", string>>;
};

export const EMPTY_AUTH_FORM_STATE: AuthFormState = { status: "idle", message: "" };

export function normalizeEmail(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const email = value.normalize("NFKC").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return null;
  return email;
}

export function validatePassword(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  if (value.length < 8 || value.length > 128) return null;
  return value;
}

export function safeNextPath(value: FormDataEntryValue | null, fallback = "/account"): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const url = new URL(value, "https://mykaraoke.invalid");
    return url.origin === "https://mykaraoke.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}

export function accountLabel(metadata: Record<string, unknown> | undefined, email: string | undefined): string {
  for (const key of ["display_name", "full_name", "name"] as const) {
    const value = metadata?.[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 40);
  }
  return email?.split("@")[0]?.slice(0, 40) || "Singer";
}
