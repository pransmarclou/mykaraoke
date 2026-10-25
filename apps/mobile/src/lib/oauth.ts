import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { parseAuthCallback } from '@/lib/auth-rules';
import { getSupabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export const mobileAuthRedirect = makeRedirectUri({ scheme: 'mykaraoke', path: 'auth/callback' });

export async function createSessionFromUrl(url: string): Promise<void> {
  const { accessToken, refreshToken, error: callbackError } = parseAuthCallback(url);
  if (callbackError) throw new Error('Google returned an authentication error. Please try again.');
  if (!accessToken || !refreshToken) return;
  const { error } = await getSupabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  if (error) throw error;
}

export async function signInWithGoogle(): Promise<'signed-in' | 'cancelled'> {
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: mobileAuthRedirect, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) throw new Error('Google sign-in is temporarily unavailable.');

  const result = await WebBrowser.openAuthSessionAsync(data.url, mobileAuthRedirect);
  if (result.type !== 'success') return 'cancelled';
  await createSessionFromUrl(result.url);
  return 'signed-in';
}
