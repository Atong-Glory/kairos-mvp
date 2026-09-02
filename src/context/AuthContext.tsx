import React, { createContext, useContext, useEffect, useState } from 'react';
import { AppState, Linking } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import { supabase, handleAuthDeepLink } from '../lib/supabase';

type Profile = {
  id: string;
  tenant_id: string;
  full_name: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenantId: string | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  tenantId: null,
  isLoading: true,
  isPasswordRecovery: false,
  clearPasswordRecovery: () => {},
  signOut: async () => {},
});

const PROFILE_NOT_FOUND = 'PGRST116';

/**
 * Loads the user's profile row. If it does not exist yet (the DB trigger in
 * supabase/migrations is the primary path), asks the `ensure_profile` RPC to
 * provision the tenant + profile from the sign-up metadata.
 */
async function loadOrCreateProfile(user: User): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, tenant_id, full_name')
    .eq('id', user.id)
    .single();

  if (!error) return data;
  if (error.code !== PROFILE_NOT_FOUND) {
    console.error('Error fetching profile:', error.message);
    return null;
  }

  const { data: created, error: createError } = await supabase
    .rpc('ensure_profile')
    .single();

  if (createError) {
    console.error('Error creating profile:', createError.message);
    return null;
  }
  const row = created as Profile;
  return { id: row.id, tenant_id: row.tenant_id, full_name: row.full_name };
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const applySession = async (next: Session | null) => {
      setSession(next);
      if (next?.user) {
        const p = await loadOrCreateProfile(next.user);
        if (!cancelled) setProfile(p);
      } else {
        setProfile(null);
      }
      if (!cancelled) setIsLoading(false);
    };

    supabase.auth.getSession().then(({ data: { session } }) => applySession(session));

    const { data: authListener } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
      if (event === 'INITIAL_SESSION') return;
      if (event === 'TOKEN_REFRESHED') {
        setSession(next);
        return;
      }
      applySession(next);
    });

    // Auth deep links (email confirmation, password reset) carry the session in the URL.
    const onUrl = ({ url }: { url: string }) => {
      if (url.startsWith('kairos://')) handleAuthDeepLink(url);
    };
    const linkSub = Linking.addEventListener('url', onUrl);
    Linking.getInitialURL().then((url) => url && onUrl({ url }));

    // Keep token auto-refresh in step with the app lifecycle (Supabase RN recommendation).
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      cancelled = true;
      authListener.subscription.unsubscribe();
      linkSub.remove();
      appStateSub.remove();
    };
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Sign out failed:', error.message);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        tenantId: profile?.tenant_id ?? null,
        isLoading,
        isPasswordRecovery,
        clearPasswordRecovery: () => setIsPasswordRecovery(false),
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
