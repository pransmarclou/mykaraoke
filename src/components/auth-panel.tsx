"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight, KeyRound, LoaderCircle, Mail, UserRound } from "lucide-react";
import {
  googleLoginAction,
  loginAction,
  recoverAction,
  registerAction,
  resetPasswordAction,
} from "@/app/account/actions";
import { EMPTY_AUTH_FORM_STATE, type AuthFormState } from "@/lib/auth/rules";

type Mode = "login" | "register" | "recover" | "reset";

function FieldError({ state, field }: { state: AuthFormState; field: keyof NonNullable<AuthFormState["fieldErrors"]> }) {
  const message = state.fieldErrors?.[field];
  return message ? <p id={`${field}-error`} className="mt-1 text-xs text-[#ffb0a2]">{message}</p> : null;
}

function Status({ state }: { state: AuthFormState }) {
  if (!state.message) return null;
  return <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-xl border px-4 py-3 text-sm ${state.status === "error" ? "border-red-300/20 bg-red-400/10 text-[#ffb0a2]" : "border-emerald-300/20 bg-emerald-400/10 text-emerald-200"}`}>{state.message}</p>;
}

function SubmitButton({ label, pending }: { label: string; pending: boolean }) {
  return <button type="submit" disabled={pending} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-black text-white shadow-[0_14px_38px_rgba(217,35,98,.25)] disabled:opacity-55">
    {pending ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <ArrowRight className="size-5" aria-hidden="true" />}{pending ? "Please wait…" : label}
  </button>;
}

function GoogleButton({ next, enabled }: { next: string; enabled: boolean }) {
  const [state, action, pending] = useActionState(googleLoginAction, EMPTY_AUTH_FORM_STATE);
  return <>
    <form action={action}>
      <input type="hidden" name="next" value={next} />
      <button type="submit" disabled={pending || !enabled} aria-describedby={!enabled ? "google-auth-status" : undefined} className="flex h-13 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-5 font-bold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45">
        <span aria-hidden="true" className="grid size-6 place-items-center rounded-full bg-white font-black text-[#1f1f1f]">G</span>
        {pending ? "Opening Google…" : "Continue with Google"}
      </button>
    </form>
    {!enabled ? <p id="google-auth-status" className="mt-2 text-xs leading-5 text-muted-foreground">Google sign in is ready in MyKaraoke but must be enabled in the hosted Supabase Auth provider settings.</p> : null}
    <Status state={state} />
  </>;
}

function EmailField({ state }: { state: AuthFormState }) {
  return <div>
    <label htmlFor="email" className="text-sm font-bold text-white">Email</label>
    <div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 focus-within:border-primary">
      <Mail className="size-5 text-muted-foreground" aria-hidden="true" />
      <input id="email" name="email" type="email" autoComplete="email" required aria-describedby={state.fieldErrors?.email ? "email-error" : undefined} className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground" placeholder="you@example.com" />
    </div>
    <FieldError state={state} field="email" />
  </div>;
}

function PasswordField({ state, confirm = false, newPassword = false }: { state: AuthFormState; confirm?: boolean; newPassword?: boolean }) {
  const name = confirm ? "confirmPassword" : "password";
  return <div>
    <label htmlFor={name} className="text-sm font-bold text-white">{confirm ? "Confirm password" : "Password"}</label>
    <div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 focus-within:border-primary">
      <KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />
      <input id={name} name={name} type="password" autoComplete={confirm || newPassword ? "new-password" : "current-password"} minLength={8} maxLength={128} required aria-describedby={state.fieldErrors?.[name] ? `${name}-error` : undefined} className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground" placeholder="8 characters or more" />
    </div>
    <FieldError state={state} field={name} />
  </div>;
}

export function AuthPanel({ mode, next, available, emailSignupEnabled = true, googleEnabled = false }: { mode: Mode; next: string; available: boolean; emailSignupEnabled?: boolean; googleEnabled?: boolean }) {
  const [loginState, login, loginPending] = useActionState(loginAction, EMPTY_AUTH_FORM_STATE);
  const [registerState, register, registerPending] = useActionState(registerAction, EMPTY_AUTH_FORM_STATE);
  const [recoverState, recover, recoverPending] = useActionState(recoverAction, EMPTY_AUTH_FORM_STATE);
  const [resetState, reset, resetPending] = useActionState(resetPasswordAction, EMPTY_AUTH_FORM_STATE);
  const loginHref = `/account?mode=login&next=${encodeURIComponent(next)}`;
  const registerHref = `/account?mode=register&next=${encodeURIComponent(next)}`;

  if (!available) return <div className="feature-panel rounded-[1.75rem] p-7 sm:p-9"><h2 className="text-2xl font-black">Accounts are unavailable</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">The hosted account service is not configured. Hosting and joining remain available without an account.</p></div>;

  if (mode === "reset") return <div className="feature-panel rounded-[1.75rem] p-7 sm:p-9">
    <h2 className="text-2xl font-black">Choose a new password</h2>
    <p className="mt-2 text-sm text-muted-foreground">Use 8–128 characters.</p>
    <form action={reset} className="mt-6 space-y-4">
      <PasswordField state={resetState} newPassword />
      <PasswordField state={resetState} confirm />
      <SubmitButton label="Update password" pending={resetPending} />
    </form>
    <Status state={resetState} />
  </div>;

  if (mode === "recover") return <div className="feature-panel rounded-[1.75rem] p-7 sm:p-9">
    <h2 className="text-2xl font-black">Reset your password</h2>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">We&apos;ll send a secure reset link if the address belongs to an account.</p>
    <form action={recover} className="mt-6">
      <EmailField state={recoverState} />
      <SubmitButton label="Send reset link" pending={recoverPending} />
    </form>
    <Status state={recoverState} />
    <Link href={loginHref} className="mt-5 inline-block text-sm font-bold text-accent underline underline-offset-4">Back to sign in</Link>
  </div>;

  if (mode === "register" && !emailSignupEnabled) return <div className="feature-panel rounded-[1.75rem] p-7 sm:p-9">
    <h2 className="text-2xl font-black">New accounts are paused</h2>
    <p className="mt-3 text-sm leading-7 text-muted-foreground">Email registration is disabled in the hosted account settings. Existing accounts can still sign in, and every room feature remains available without an account.</p>
    <Link href={loginHref} className="mt-5 inline-block text-sm font-bold text-accent underline underline-offset-4">Back to sign in</Link>
  </div>;

  const state = mode === "register" ? registerState : loginState;
  const action = mode === "register" ? register : login;
  const pending = mode === "register" ? registerPending : loginPending;
  return <div className="feature-panel rounded-[1.75rem] p-7 sm:p-9">
    <div className="grid grid-cols-2 rounded-xl border border-white/10 bg-black/20 p-1" role="navigation" aria-label="Account access">
      <Link href={loginHref} aria-current={mode === "login" ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-center text-sm font-black ${mode === "login" ? "bg-white/10 text-white" : "text-muted-foreground"}`}>Sign in</Link>
      <Link href={registerHref} aria-current={mode === "register" ? "page" : undefined} className={`rounded-lg px-3 py-2.5 text-center text-sm font-black ${mode === "register" ? "bg-white/10 text-white" : "text-muted-foreground"}`}>Create account</Link>
    </div>
    <div className="mt-7">
      <GoogleButton next={next} enabled={googleEnabled} />
      <div className="my-6 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground"><span className="h-px flex-1 bg-white/10" />or use email<span className="h-px flex-1 bg-white/10" /></div>
      <form action={action} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "register" ? <div>
          <label htmlFor="displayName" className="text-sm font-bold text-white">Display name</label>
          <div className="mt-2 flex h-13 items-center gap-3 rounded-xl border border-white/15 bg-white/5 px-4 focus-within:border-primary"><UserRound className="size-5 text-muted-foreground" aria-hidden="true" /><input id="displayName" name="displayName" autoComplete="name" minLength={2} maxLength={24} required aria-describedby={state.fieldErrors?.displayName ? "displayName-error" : undefined} className="min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-muted-foreground" placeholder="How should we call you?" /></div>
          <FieldError state={state} field="displayName" />
        </div> : null}
        <EmailField state={state} />
        <PasswordField state={state} newPassword={mode === "register"} />
        {mode === "register" ? <PasswordField state={state} confirm /> : null}
        <SubmitButton label={mode === "register" ? "Create account" : "Sign in"} pending={pending} />
      </form>
      <Status state={state} />
      {mode === "login" ? <Link href={`/account?mode=recover&next=${encodeURIComponent(next)}`} className="mt-5 inline-block text-sm font-bold text-accent underline underline-offset-4">Forgot password?</Link> : null}
    </div>
  </div>;
}
