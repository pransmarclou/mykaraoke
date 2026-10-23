import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Cloud, UserRound } from "lucide-react";
import { AuthPanel } from "@/components/auth-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { accountLabel, safeNextPath } from "@/lib/auth/rules";
import { getAuthCapabilities, getCurrentUser } from "@/lib/auth/server";
import { signOutAction } from "@/app/account/actions";

export const metadata: Metadata = { title: "Account", description: "Sign in or create your MyKaraoke account." };
export const dynamic = "force-dynamic";

type AccountMode = "login" | "register" | "recover";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string; error?: string }> }) {
  const params = await searchParams;
  const mode: AccountMode = params.mode === "register" || params.mode === "recover" ? params.mode : "login";
  const next = safeNextPath(params.next ?? null);
  const capabilities = await getAuthCapabilities();
  const available = capabilities.available;
  const user = available ? await getCurrentUser() : null;
  const provider = typeof user?.app_metadata.provider === "string" ? user.app_metadata.provider : "email";

  return <div className="page-shell flex min-h-screen flex-col">
    <SiteHeader />
    <main className="content-wrap flex flex-1 items-center py-12 md:py-20">
      <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_0.88fr] lg:gap-16">
        <section aria-labelledby="account-title">
          <p className="eyebrow">Your MyKaraoke account</p>
          <h1 id="account-title" className="mt-6 max-w-3xl text-[clamp(3.2rem,7vw,6.8rem)] leading-[0.9] font-black tracking-[-0.07em]">Keep your party identity with you.</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#c9bec3]">Sign in with email or Google on any browser. Accounts are optional for the web MVP—room codes and guest joining still work without one.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-xs font-semibold text-[#ead6da]"><span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Email and password</span><span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Google sign in</span><span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">Secure hosted sessions</span></div>
        </section>

        {user ? <section className="feature-panel rounded-[1.75rem] p-7 sm:p-9" aria-labelledby="signed-in-title">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/15 text-accent"><UserRound className="size-7" aria-hidden="true" /></span>
          <p className="eyebrow mt-6">Signed in</p>
          <h2 id="signed-in-title" className="mt-2 text-3xl font-black">Welcome, {accountLabel(user.user_metadata, user.email)}.</h2>
          <p className="mt-3 break-all text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
            <p className="flex items-center gap-2 text-white"><BadgeCheck className="size-5 text-emerald-300" aria-hidden="true" />Account verified by Supabase Auth</p>
            <p className="flex items-center gap-2 text-muted-foreground"><Cloud className="size-5 text-accent" aria-hidden="true" />Signed in with {provider === "google" ? "Google" : "email"}</p>
          </div>
          <p className="mt-5 text-xs leading-6 text-muted-foreground">Your account identity works across signed-in browsers. Favorites and room history remain device-local until their separate sync slice is implemented.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link href="/host" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-black text-white">Host a room <ArrowRight className="size-4" aria-hidden="true" /></Link>
            <Link href="/join" className="flex h-12 items-center justify-center rounded-xl border border-white/15 bg-white/5 px-5 font-bold text-white">Join a room</Link>
          </div>
          <form action={signOutAction}><button type="submit" className="mt-4 h-11 w-full rounded-xl text-sm font-bold text-muted-foreground transition hover:bg-white/5 hover:text-white">Sign out</button></form>
        </section> : <div>
          {params.error ? <p role="alert" className="mb-4 rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm text-[#ffb0a2]">Sign in could not be completed. Please try again.</p> : null}
          <AuthPanel mode={mode} next={next} available={available} emailSignupEnabled={capabilities.emailSignup} googleEnabled={capabilities.google} />
        </div>}
      </div>
    </main>
    <SiteFooter />
  </div>;
}
