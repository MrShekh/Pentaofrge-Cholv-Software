import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password', '/api/auth'];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static files, Next internals, and public paths
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    PUBLIC_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionToken = req.cookies.get('chool_session_token')?.value;

  if (!sessionToken) {
    // If it's an API route, return 401 JSON
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // For page routes, redirect directly to /login
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
