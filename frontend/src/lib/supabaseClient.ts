import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
// Support both variable names for compatibility
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'placeholder-key';

// Get the site URL - defaults to localhost in dev, should be set to production URL in prod
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 
  (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

console.log('Supabase Config:', { 
  url: supabaseUrl, 
  key: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : 'missing',
  siteUrl 
});

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // important for OAuth callback
      // Set the redirect URL for email confirmations and password resets
      redirectTo: `${siteUrl}/auth/callback`,
    },
  }
);
