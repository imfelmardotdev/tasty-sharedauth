import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  // Check if session exists with fresh data
  const { data: { session }, error } = await supabase.auth.getSession();
  
  // Double-check the user is actually authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  // Get URL info
  const url = req.nextUrl.clone();
  const { pathname } = url;
  
  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard', '/profile', '/settings'];
  
  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password'];
  
  const isAuthenticated = !!session && !!user;
  
  // Check if the current route is protected and no valid session exists
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    console.log('No valid session, redirecting to login');
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }
  
  // Check if trying to access login/register pages while already logged in
  if (publicRoutes.includes(pathname) && isAuthenticated) {
    console.log('User already logged in, redirecting to dashboard');
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }
  
  return res;
}

// Specify which paths this middleware should run for
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.ico).*)'],
};
