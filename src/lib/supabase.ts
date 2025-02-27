import { createClient } from "@supabase/supabase-js";

// Validate required environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Required environment variables are missing:', {
    url: !!SUPABASE_URL,
    anonKey: !!SUPABASE_ANON_KEY
  });
  throw new Error('Required environment variables are missing');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: window.localStorage, // Explicitly use window.localStorage
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  },
);

// Validate service role key
const hasServiceKey = !!import.meta.env.VITE_SUPABASE_SERVICE_KEY;
if (!hasServiceKey) {
  console.error('Service role key is not configured. Admin operations will not work.');
}

// Create a supabase client with the service role key for admin operations
export const supabaseAdmin = hasServiceKey
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_SERVICE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false // Disable session detection for admin client
        },
      },
    )
  : null;

// Verify admin client initialization
if (supabaseAdmin) {
  supabaseAdmin.auth.admin.listUsers().then(() => {
    console.log('Admin client initialized successfully');
  }).catch(error => {
    console.error('Admin client initialization failed:', error.message);
    // Reset admin client if service key is invalid
    (globalThis as any).supabaseAdmin = null;
  });
}

// Add error logging
if (supabase) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.log("Supabase auth event:", event, {
      event,
      userId: session?.user?.id,
      email: session?.user?.email,
      timestamp: new Date().toISOString(),
    });
  });
}
