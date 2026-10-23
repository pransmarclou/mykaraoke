import type { NextRequest } from "next/server";
import { refreshAuthSession } from "@/lib/auth/proxy";
import { buildContentSecurityPolicy, createNonce } from "@/lib/security/csp";

// Issues a fresh nonce per page request. Next.js reads it from the request's
// Content-Security-Policy header and applies it to its own scripts; the root
// layout passes it to the inline theme bootstrap.
export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const policy = buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV === "development",
    appOrigin: process.env.APP_ORIGIN,
    supabaseUrl: process.env.SUPABASE_URL,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = await refreshAuthSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|media/|brand/|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
