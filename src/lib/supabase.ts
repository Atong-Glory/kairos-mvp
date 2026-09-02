import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import ENV from '../config';

export const AUTH_REDIRECT_URL = 'kairos://auth-callback';

export const supabase = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Stateless client used for actions that must not touch the signed-in user's
 * session (e.g. creating an account on behalf of an invited crew member).
 */
export const supabaseNoSession = createClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

/** Extracts a Supabase session from an auth deep link and stores it. */
export async function handleAuthDeepLink(url: string): Promise<boolean> {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.hash.startsWith('#') ? parsed.hash.slice(1) : parsed.search.slice(1));

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error('exchangeCodeForSession failed:', error.message);
    return !error;
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) console.error('setSession failed:', error.message);
    return !error;
  }

  const errorDescription = params.get('error_description');
  if (errorDescription) console.error('Auth link error:', errorDescription);
  return false;
}
