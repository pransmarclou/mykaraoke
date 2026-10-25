import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';

export type AuthContextValue = {
  configured: boolean;
  isLoading: boolean;
  session: Session | null;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
