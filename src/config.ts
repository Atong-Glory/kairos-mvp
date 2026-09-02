import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra ?? {};

const supabaseUrl: string | undefined = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey: string | undefined = extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY (see .env.example).'
  );
}

const ENV = { supabaseUrl, supabaseAnonKey };

export default ENV;
