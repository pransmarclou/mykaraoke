import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/auth-panel";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getAuthCapabilities, getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const available = (await getAuthCapabilities()).available;
  if (available && !(await getCurrentUser())) redirect("/account?mode=recover");
  return <div className="page-shell flex min-h-screen flex-col"><SiteHeader /><main className="content-wrap flex flex-1 items-center justify-center py-14"><div className="w-full max-w-xl"><AuthPanel mode="reset" next="/account" available={available} /></div></main><SiteFooter /></div>;
}
