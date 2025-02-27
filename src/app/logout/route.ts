import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
  
  // Sign out the user completely from Supabase
  await supabase.auth.signOut({ scope: 'global' });
  
  // Clear cookies manually to ensure they're removed
  cookieStore.getAll().forEach(cookie => {
    if (cookie.name.includes('supabase') || cookie.name.includes('auth')) {
      cookieStore.delete(cookie.name);
    }
  });
  
  return NextResponse.redirect(new URL('/login', request.url), {
    status: 302,
  });
}
