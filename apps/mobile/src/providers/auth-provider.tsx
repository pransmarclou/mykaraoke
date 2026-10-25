import type { Session } from '@supabase/supabase-js';
import type { PropsWithChildren } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';

import { AuthContext } from '@/hooks/use-auth';
import { createSessionFromUrl } from '@/lib/oauth';
import { getSupabase, isAuthConfigured } from '@/lib/supabase';

export function AuthProvider({ children }: PropsWithChildren) {
  const configured = isAuthConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(configured);

  useEffect(() => {
    if (!configured) return;

    const supabase = getSupabase();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (Platform.OS === 'web') return;
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    const urlListener = Linking.addEventListener('url', ({ url }) => {
      void createSessionFromUrl(url).catch(() => undefined);
    });
    void Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl?.includes('auth/callback')) void createSessionFromUrl(initialUrl).catch(() => undefined);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
      urlListener.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [configured]);

  const value = useMemo(() => ({
    configured,
    isLoading,
    session,
    signOut: async () => {
      if (!configured) return;
      const { error } = await getSupabase().auth.signOut();
      if (error) throw error;
    },
  }), [configured, isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
