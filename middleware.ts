import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon.ico') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // The home page handles the single name-entry flow.
  // Never force visitors through a second /login screen.
  if (pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = { matcher: ['/((?!api).*)'] };
