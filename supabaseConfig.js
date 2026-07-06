import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhnrvmslifgdybebdlgl.supabase.co';
const supabaseAnonKey = 'sb_publishable_6AWpEI82vGS1KHJ1Vpm-Zw_Y8uLp7nM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});