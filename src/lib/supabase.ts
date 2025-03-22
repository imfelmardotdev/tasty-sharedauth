import { createClient, AuthChangeEvent, Session } from "@supabase/supabase-js";

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

// Initialize Supabase client with PKCE auth flow
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: window.localStorage,
    detectSessionInUrl: true,
    flowType: 'pkce',
    debug: import.meta.env.DEV,
    storageKey: 'auth-storage',
  },
});

// Configure default auth behavior
const defaultAuthOptions = {
  emailRedirectTo: `${window.location.origin}/auth/callback`,
  shouldCreateUser: true
};

// Log configuration details for debugging
console.log('Supabase auth configuration:', {
  flowType: 'pkce',
  redirectUrl: defaultAuthOptions.emailRedirectTo,
  detectSession: true,
  mode: import.meta.env.MODE
});

// Set up auth state change listener
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  console.log('Auth state change:', {
    event,
    userId: session?.user?.id,
    email: session?.user?.email,
    timestamp: new Date().toISOString(),
  });
});

// Get initial session state
supabase.auth.getSession().then(({ data: { session }}) => {
  console.log('Initial auth state:', {
    isAuthenticated: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString()
  });
});

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
