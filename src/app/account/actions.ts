"use server";

import { redirect } from "next/navigation";
import { createServerAuthClient, getAuthCapabilities, hasAuthConfiguration } from "@/lib/auth/server";
import {
  type AuthFormState,
  normalizeEmail,
  safeNextPath,
  validatePassword,
} from "@/lib/auth/rules";
import { normalizeDisplayName } from "@/lib/rooms/display-name";
import { configuredAppOrigin } from "@/lib/rooms/http";

function unavailable(): AuthFormState {
  return { status: "error", message: "Accounts are temporarily unavailable. You can still host or join without signing in." };
}

function callbackUrl(next: string) {
  const callback = new URL("/auth/callback", configuredAppOrigin());
  callback.searchParams.set("next", next);
  return callback.toString();
}

export async function loginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!hasAuthConfiguration()) return unavailable();
  const email = normalizeEmail(formData.get("email"));
  const password = validatePassword(formData.get("password"));
  const next = safeNextPath(formData.get("next"));
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!email) fieldErrors.email = "Enter a valid email address.";
  if (!password) fieldErrors.password = "Enter your password (8–128 characters).";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Check the highlighted fields.", fieldErrors };

  try {
    const client = await createServerAuthClient();
    const { error } = await client.auth.signInWithPassword({ email: email!, password: password! });
    if (error) return { status: "error", message: "That email and password could not be verified." };
  } catch {
    return { status: "error", message: "Sign in could not reach the hosted account service. Try again." };
  }
  redirect(next);
}

export async function registerAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!hasAuthConfiguration()) return unavailable();
  const email = normalizeEmail(formData.get("email"));
  const password = validatePassword(formData.get("password"));
  const confirmPassword = formData.get("confirmPassword");
  const next = safeNextPath(formData.get("next"));
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  let displayName: string | null = null;
  try {
    displayName = normalizeDisplayName(formData.get("displayName"));
  } catch {
    fieldErrors.displayName = "Use 2–24 letters, numbers, spaces, apostrophes, dots, or hyphens.";
  }
  if (!email) fieldErrors.email = "Enter a valid email address.";
  if (!password) fieldErrors.password = "Use 8–128 characters for your password.";
  if (confirmPassword !== password) fieldErrors.confirmPassword = "Passwords do not match.";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Check the highlighted fields.", fieldErrors };

  try {
    const client = await createServerAuthClient();
    const { data, error } = await client.auth.signUp({
      email: email!,
      password: password!,
      options: { data: { display_name: displayName }, emailRedirectTo: callbackUrl(next) },
    });
    if (error) return { status: "error", message: "Your account could not be created. Try another email or try again later." };
    if (!data.session) return { status: "success", message: "Check your email to confirm your MyKaraoke account, then sign in." };
  } catch {
    return { status: "error", message: "Registration could not reach the hosted account service. Try again." };
  }
  redirect(next);
}

export async function googleLoginAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!hasAuthConfiguration()) return unavailable();
  if (!(await getAuthCapabilities()).google) return { status: "error", message: "Google sign in needs to be enabled in Supabase Auth first. Use email for now." };
  const next = safeNextPath(formData.get("next"));
  let destination: string | null = null;
  try {
    const client = await createServerAuthClient();
    const { data, error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(next), skipBrowserRedirect: true },
    });
    if (error || !data.url) return { status: "error", message: "Google sign in is not available yet. Try email instead." };
    destination = data.url;
  } catch {
    return { status: "error", message: "Google sign in could not reach the hosted account service. Try again." };
  }
  redirect(destination);
}

export async function recoverAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!hasAuthConfiguration()) return unavailable();
  const email = normalizeEmail(formData.get("email"));
  if (!email) return { status: "error", message: "Enter a valid email address.", fieldErrors: { email: "Enter a valid email address." } };
  try {
    const client = await createServerAuthClient();
    await client.auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/account/reset-password") });
  } catch {
    return { status: "error", message: "The recovery request could not reach the hosted account service. Try again." };
  }
  return { status: "success", message: "If that email has an account, a password reset link is on its way." };
}

export async function resetPasswordAction(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  if (!hasAuthConfiguration()) return unavailable();
  const password = validatePassword(formData.get("password"));
  const confirmPassword = formData.get("confirmPassword");
  const fieldErrors: AuthFormState["fieldErrors"] = {};
  if (!password) fieldErrors.password = "Use 8–128 characters for your password.";
  if (confirmPassword !== password) fieldErrors.confirmPassword = "Passwords do not match.";
  if (Object.keys(fieldErrors).length) return { status: "error", message: "Check the highlighted fields.", fieldErrors };
  try {
    const client = await createServerAuthClient();
    const { error } = await client.auth.updateUser({ password: password! });
    if (error) return { status: "error", message: "This reset link is invalid or expired. Request a new one." };
  } catch {
    return { status: "error", message: "The password could not be updated. Try again." };
  }
  return { status: "success", message: "Password updated. You can continue with your signed-in account." };
}

export async function signOutAction() {
  if (hasAuthConfiguration()) {
    const client = await createServerAuthClient();
    await client.auth.signOut();
  }
  redirect("/");
}
