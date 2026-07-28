import Constants from 'expo-constants';

const ENV = {
  supabaseUrl: Constants.expoConfig?.extra?.supabaseUrl || process.env.SUPABASE_URL || 'YOUR_SUPABASE_URL',
  supabaseAnonKey: Constants.expoConfig?.extra?.supabaseAnonKey || process.env.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY',
};

export default ENV;
