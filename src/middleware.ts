import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('gcp-access-token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Protected routes
  //    Adjust the matcher or lists as needed. 
  //    For now, we protect everything except public paths and API routes.
  //    Actually, simpler to specificy what IS protected or unprotected.

  const isAuthPage = pathname === '/login';
  const isPublicPath = pathname === '/_not-found' || pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/api') || pathname === '/favicon.ico';

  // If user is NOT logged in and tries to access a protected route
  if (!session && !isAuthPage && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If user IS logged in and tries to access login page
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/select-project', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
