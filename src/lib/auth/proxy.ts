import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function refreshAuthSession(request: NextRequest, requestHeaders: Headers) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request: { headers: requestHeaders } });
  if (!url || !key) return response;

  const client = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request: { headers: requestHeaders } });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Validates the session and refreshes expired access tokens when possible.
  try {
    await client.auth.getClaims();
  } catch {
    // Account availability must never block the anonymous host/join MVP.
  }
  return response;
}
