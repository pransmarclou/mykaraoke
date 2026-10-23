import { NextResponse } from "next/server";
import { createServerAuthClient, hasAuthConfiguration } from "@/lib/auth/server";
import { safeNextPath } from "@/lib/auth/rules";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  if (hasAuthConfiguration() && code) {
    const client = await createServerAuthClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  const failure = new URL("/account", url.origin);
  failure.searchParams.set("error", "callback");
  return NextResponse.redirect(failure);
}
