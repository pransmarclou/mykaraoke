import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

export function hasAuthConfiguration(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  return Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
}

export const getAuthCapabilities = cache(async () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { available: false, emailSignup: false, google: false };
  try {
    const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, cache: "no-store" });
    if (!response.ok) return { available: true, emailSignup: true, google: false };
    const settings = await response.json() as { disable_signup?: boolean; external?: { email?: boolean; google?: boolean } };
    return {
      available: true,
      emailSignup: settings.disable_signup !== true && settings.external?.email !== false,
      google: settings.external?.google === true,
    };
  } catch {
    return { available: true, emailSignup: true, google: false };
  }
});

export async function createServerAuthClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth is not configured");
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write response cookies. The request proxy
          // refreshes sessions before rendering; Server Actions and handlers can write.
        }
      },
    },
  });
}

export const getCurrentUser = cache(async () => {
  if (!hasAuthConfiguration()) return null;
  try {
    const client = await createServerAuthClient();
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user;
  } catch {
    return null;
  }
});
